"""Pilot setup-summary endpoint tests."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point, Polygon
from django.utils import timezone

from spray.models import (
    Block,
    BlockVerdict,
    IntegrationConnection,
    Membership,
    SensorStation,
    SensorStationBlock,
    Vineyard,
)


pytestmark = pytest.mark.django_db


def _polygon():
    return Polygon(
        (
            (-122.0, 38.0),
            (-122.0, 38.01),
            (-121.99, 38.01),
            (-121.99, 38.0),
            (-122.0, 38.0),
        ),
        srid=4326,
    )


def _setup(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    return client, org


def test_setup_summary_empty_org(auth_client, make_org, make_membership):
    client, org = _setup(auth_client, make_org, make_membership)

    resp = client.get(f"/api/spray/orgs/{org.id}/setup-summary")

    assert resp.status_code == 200
    assert resp.data["counts"]["vineyards"] == 0
    assert resp.data["steps"][0]["id"] == "create_vineyard"
    assert resp.data["steps"][0]["complete"] is False


def test_setup_summary_marks_completed_steps(auth_client, make_org, make_membership):
    client, org = _setup(auth_client, make_org, make_membership)
    vineyard = Vineyard.objects.create(
        org=org,
        name="Estate",
        region=org.region,
        centroid=Point(-122.0, 38.0, srid=4326),
    )
    block = Block.objects.create(vineyard=vineyard, name="North", geom=_polygon())
    conn = IntegrationConnection.objects.create(
        org=org,
        vendor=IntegrationConnection.Vendor.DAVIS,
        vendor_account_id="acct",
        token_ciphertext=b"encrypted",
        status=IntegrationConnection.Status.ACTIVE,
        last_health_at=timezone.now() - timedelta(hours=25),
    )
    station = SensorStation.objects.create(
        connection=conn,
        vendor_station_id="station",
        name="Station",
        lat=Decimal("38.0"),
        lon=Decimal("-122.0"),
        last_seen_at=timezone.now() - timedelta(hours=3),
    )
    SensorStationBlock.objects.create(station=station, block=block)
    BlockVerdict.objects.create(
        block=block,
        date=timezone.now().date(),
        powdery_severity_1_10=8.0,
        downy_severity_1_10=2.0,
        powdery_confidence=0.8,
        downy_confidence=0.7,
        action="spray",
        urgency="24h",
        drivers=[],
        split_summary="seeded",
        forecast_7d=[
            {
                "date": (timezone.now().date() + timedelta(days=i)).isoformat(),
                "powdery_severity_1_10": 1.0,
                "downy_severity_1_10": 1.0,
                "action": "hold",
            }
            for i in range(1, 8)
        ],
        advisory_events=[],
        model_versions={"demo": "1"},
        generated_at=timezone.now(),
        audit_hash="sha256:" + ("e" * 64),
    )

    resp = client.get(f"/api/spray/orgs/{org.id}/setup-summary")

    assert resp.status_code == 200
    assert all(step["complete"] for step in resp.data["steps"])
    assert resp.data["counts"]["mapped_stations"] == 1
    assert resp.data["counts"]["stale_stations"] == 1
    assert resp.data["counts"]["stale_integrations"] == 1
    assert resp.data["warnings"]


def test_setup_summary_rejects_cross_org(auth_client, make_org, make_membership, make_user):
    owner_client, org = _setup(auth_client, make_org, make_membership)
    other_user = make_user()
    other_client, _ = auth_client(other_user)

    resp = other_client.get(f"/api/spray/orgs/{org.id}/setup-summary")

    assert resp.status_code in (403, 404)
