"""Lake writer tests (M0-04 step 9).

Uses moto to mock S3. The forwarder pulls real DataLakeEvent rows from
the test database and writes Parquet to a moto-mocked bucket.
"""

from __future__ import annotations

import io
import os

import pyarrow.parquet as pq
import pytest

from spray.models import DataLakeEvent

# moto must be imported BEFORE boto3 client creation. Use the unified
# `mock_aws` decorator from moto 5.x.
moto = pytest.importorskip("moto")
boto3 = pytest.importorskip("boto3")


pytestmark = pytest.mark.django_db


BUCKET = "graft-spray-lake-test"


@pytest.fixture(autouse=True)
def aws_env(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_REGION", "us-west-2")
    monkeypatch.setenv("LAKE_BUCKET", BUCKET)
    # Force re-import so module-level constants pick up the test bucket.
    import importlib
    import graft_worker.settings as worker_settings

    importlib.reload(worker_settings)


@pytest.fixture
def s3_bucket():
    from moto import mock_aws

    with mock_aws():
        client = boto3.client("s3", region_name="us-west-2")
        client.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": "us-west-2"},
        )
        yield client


def _make_event(make_org, make_user, *, category="vineyard.created", payload=None):
    org = make_org()
    user = make_user()
    return DataLakeEvent.objects.unscoped().create(
        org=org,
        user=user,
        category=category,
        schema_version="v1",
        payload=payload or {"vineyard_id": "x", "name": "Y"},
    )


def test_forwards_pending_events(s3_bucket, make_org, make_user):
    from graft_worker import lake_writer

    e1 = _make_event(make_org, make_user)
    e2 = _make_event(make_org, make_user)

    n = lake_writer.forward_pending_events()
    assert n == 2

    e1.refresh_from_db()
    e2.refresh_from_db()
    assert e1.forwarded_at is not None
    assert e2.forwarded_at is not None

    # At least one Parquet object landed.
    keys = [
        obj["Key"]
        for obj in s3_bucket.list_objects_v2(Bucket=BUCKET).get("Contents", [])
    ]
    assert keys
    assert all(k.endswith(".parquet") for k in keys)


def test_forwards_zero_when_nothing_pending(s3_bucket):
    from graft_worker import lake_writer

    assert lake_writer.forward_pending_events() == 0


def test_idempotent_rerun_does_not_duplicate(s3_bucket, make_org, make_user):
    from graft_worker import lake_writer

    _make_event(make_org, make_user)
    first = lake_writer.forward_pending_events()
    second = lake_writer.forward_pending_events()
    assert first == 1
    assert second == 0  # Already forwarded; no work.


def test_partitioning_by_org(s3_bucket, make_org, make_user):
    from graft_worker import lake_writer

    org_a = make_org(name="A")
    org_b = make_org(name="B")
    user = make_user()

    DataLakeEvent.objects.unscoped().create(
        org=org_a,
        user=user,
        category="vineyard.created",
        schema_version="v1",
        payload={"vineyard_id": "a", "name": "A"},
    )
    DataLakeEvent.objects.unscoped().create(
        org=org_b,
        user=user,
        category="vineyard.created",
        schema_version="v1",
        payload={"vineyard_id": "b", "name": "B"},
    )

    lake_writer.forward_pending_events()

    keys = [
        obj["Key"]
        for obj in s3_bucket.list_objects_v2(Bucket=BUCKET).get("Contents", [])
    ]
    org_prefixes = {k.split("/")[0] for k in keys}
    assert str(org_a.id) in org_prefixes
    assert str(org_b.id) in org_prefixes


def test_parquet_payload_round_trips(s3_bucket, make_org, make_user):
    from graft_worker import lake_writer

    event = _make_event(
        make_org,
        make_user,
        payload={"vineyard_id": "round-trip", "name": "RT"},
    )
    lake_writer.forward_pending_events()

    keys = [
        obj["Key"]
        for obj in s3_bucket.list_objects_v2(Bucket=BUCKET).get("Contents", [])
    ]
    assert len(keys) == 1
    body = s3_bucket.get_object(Bucket=BUCKET, Key=keys[0])["Body"].read()
    table = pq.read_table(io.BytesIO(body))
    df = table.to_pandas()
    assert len(df) == 1
    assert df.iloc[0]["category"] == "vineyard.created"
    assert df.iloc[0]["id"] == str(event.id)
