"""Capture API endpoint tests (M1-09).

Uses moto-mocked S3 for the imagery bucket so init/finalize roundtrips
through real-shaped responses without touching AWS.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.gis.geos import Polygon
from django.test import override_settings
from django.utils import timezone

from spray.models import Block, Capture, DataLakeEvent, Membership, Vineyard


moto = pytest.importorskip("moto")
boto3 = pytest.importorskip("boto3")


pytestmark = pytest.mark.django_db


BUCKET = "graft-spray-imagery-test"


def _polygon():
    coords = (
        (-122.0, 38.0),
        (-122.0, 38.01),
        (-121.99, 38.01),
        (-121.99, 38.0),
        (-122.0, 38.0),
    )
    return Polygon(coords, srid=4326)


@pytest.fixture(autouse=True)
def aws_env(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_REGION", "us-west-2")
    monkeypatch.setenv("IMAGERY_BUCKET", BUCKET)
    import importlib
    from django.conf import settings as dj_settings

    dj_settings.AWS_ACCESS_KEY_ID = "test"
    dj_settings.AWS_SECRET_ACCESS_KEY = "test"
    dj_settings.AWS_REGION = "us-west-2"
    dj_settings.IMAGERY_BUCKET = BUCKET


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


def _setup(auth_client, make_org, make_membership, role=Membership.Role.OWNER):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=role)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    b = Block.objects.unscoped().create(vineyard=v, name="B", geom=_polygon())
    return client, user, org, v, b


def test_init_creates_pending_capture(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {
            "kind": "photo",
            "mime_type": "image/jpeg",
            "size_bytes": 500_000,
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert "capture" in resp.data
    assert "upload" in resp.data
    cap = resp.data["capture"]
    assert cap["status"] == "pending"
    assert cap["download_url"] is None  # not uploaded yet

    db_cap = Capture.objects.unscoped().get(id=cap["id"])
    assert db_cap.s3_key.startswith(f"{org.id}/{block.id}/")
    assert db_cap.s3_key.endswith(".jpg")


def test_init_rejects_unsupported_mime(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {"kind": "photo", "mime_type": "image/png", "size_bytes": 100},
        format="json",
    )
    assert resp.status_code == 400


def test_init_rejects_oversize(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {
            "kind": "photo",
            "mime_type": "image/jpeg",
            "size_bytes": 30 * 1024 * 1024,
        },
        format="json",
    )
    assert resp.status_code == 400


def test_init_viewer_denied(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(
        auth_client, make_org, make_membership, role=Membership.Role.VIEWER
    )
    resp = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {"kind": "photo", "mime_type": "image/jpeg", "size_bytes": 100},
        format="json",
    )
    assert resp.status_code == 403


def test_finalize_409_when_s3_missing(
    s3_bucket, auth_client, make_org, make_membership
):
    """No S3 object → finalize returns 409 (upload incomplete)."""
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    init = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {"kind": "photo", "mime_type": "image/jpeg", "size_bytes": 100},
        format="json",
    )
    cap_id = init.data["capture"]["id"]

    resp = client.post(
        f"/api/spray/orgs/{org.id}/captures/{cap_id}/finalize", {}, format="json"
    )
    assert resp.status_code == 409


def test_finalize_flips_to_uploaded_when_s3_present(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    init = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {"kind": "photo", "mime_type": "image/jpeg", "size_bytes": 100},
        format="json",
    )
    cap = init.data["capture"]
    s3_key = Capture.objects.unscoped().get(id=cap["id"]).s3_key

    # Simulate the browser-S3 PUT.
    s3_bucket.put_object(Bucket=BUCKET, Key=s3_key, Body=b"\xff" * 100)

    resp = client.post(
        f"/api/spray/orgs/{org.id}/captures/{cap['id']}/finalize",
        {},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["status"] == "uploaded"
    assert resp.data["download_url"]  # presigned GET URL minted

    # capture.uploaded event emitted.
    assert (
        DataLakeEvent.objects.unscoped()
        .filter(category="capture.uploaded")
        .count()
        == 1
    )


def test_finalize_idempotent_on_already_uploaded(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    init = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/captures/init",
        {"kind": "photo", "mime_type": "image/jpeg", "size_bytes": 100},
        format="json",
    )
    cap = init.data["capture"]
    s3_key = Capture.objects.unscoped().get(id=cap["id"]).s3_key
    s3_bucket.put_object(Bucket=BUCKET, Key=s3_key, Body=b"\x00" * 100)

    r1 = client.post(
        f"/api/spray/orgs/{org.id}/captures/{cap['id']}/finalize", {}, format="json"
    )
    r2 = client.post(
        f"/api/spray/orgs/{org.id}/captures/{cap['id']}/finalize", {}, format="json"
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert (
        DataLakeEvent.objects.unscoped()
        .filter(category="capture.uploaded")
        .count()
        == 1
    )


def test_list_filters_by_block(
    s3_bucket, auth_client, make_org, make_membership
):
    client, user, org, v, block = _setup(auth_client, make_org, make_membership)
    other_block = Block.objects.unscoped().create(
        vineyard=v, name="B2", geom=_polygon()
    )
    Capture.objects.unscoped().create(
        block=block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key="k1",
        status=Capture.Status.UPLOADED,
    )
    Capture.objects.unscoped().create(
        block=other_block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key="k2",
        status=Capture.Status.UPLOADED,
    )

    resp = client.get(
        f"/api/spray/orgs/{org.id}/captures?block_id={block.id}"
    )
    assert resp.status_code == 200
    assert len(resp.data) == 1


def test_list_filters_by_date_kind_and_limit(
    s3_bucket, auth_client, make_org, make_membership
):
    client, user, org, v, block = _setup(auth_client, make_org, make_membership)
    c1 = Capture.objects.unscoped().create(
        block=block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key="k_date1",
        status=Capture.Status.UPLOADED,
    )
    c2 = Capture.objects.unscoped().create(
        block=block,
        uploader=user,
        kind=Capture.Kind.VIDEO,
        s3_key="k_date2",
        status=Capture.Status.UPLOADED,
    )
    Capture.objects.filter(pk=c1.pk).update(
        created_at=timezone.now() - timedelta(days=5)
    )

    today = timezone.now().date().isoformat()
    past = (timezone.now() - timedelta(days=7)).date().isoformat()

    r = client.get(
        f"/api/spray/orgs/{org.id}/captures?date_from={past}&date_to={today}&kind=video"
    )
    assert r.status_code == 200
    assert len(r.data) == 1
    assert r.data[0]["id"] == str(c2.id)

    r2 = client.get(f"/api/spray/orgs/{org.id}/captures?limit=1")
    assert r2.status_code == 200
    assert len(r2.data) == 1


def test_list_rejects_invalid_date(
    s3_bucket, auth_client, make_org, make_membership
):
    client, _, org, _, _ = _setup(auth_client, make_org, make_membership)
    r = client.get(f"/api/spray/orgs/{org.id}/captures?date_from=not-a-date")
    assert r.status_code == 400


def test_detail_archive(
    s3_bucket, auth_client, make_org, make_membership
):
    client, user, org, _, block = _setup(auth_client, make_org, make_membership)
    cap = Capture.objects.unscoped().create(
        block=block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key="k_arc",
        status=Capture.Status.UPLOADED,
    )

    resp = client.delete(
        f"/api/spray/orgs/{org.id}/captures/{cap.id}"
    )
    assert resp.status_code == 204
    cap.refresh_from_db()
    assert cap.archived_at is not None
