"""Dashboard summary endpoint tests."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.gis.geos import Polygon
from django.utils import timezone

from spray.models import Block, BlockVerdict, Capture, Membership, Vineyard


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


def test_dashboard_summary_returns_blocks_and_latest_verdict(
    auth_client,
    make_org,
    make_membership,
):
    client, user = auth_client()
    org = make_org(name="Pilot Estate")
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    vineyard = Vineyard.objects.create(org=org, name="Estate", region=org.region)
    block = Block.objects.create(vineyard=vineyard, name="North", geom=_polygon())
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
        split_summary="elevated",
        forecast_7d=[
            {
                "date": (timezone.now().date() + timedelta(days=1)).isoformat(),
                "powdery_severity_1_10": 7.0,
                "downy_severity_1_10": 2.0,
                "action": "spray",
            }
        ],
        advisory_events=[],
        model_versions={"demo": "1"},
        generated_at=timezone.now(),
        audit_hash="sha256:" + ("a" * 64),
    )

    resp = client.get(f"/api/spray/orgs/{org.id}/dashboard-summary")

    assert resp.status_code == 200
    assert resp.data["org"]["name"] == "Pilot Estate"
    assert resp.data["blocks"][0]["name"] == "North"
    assert resp.data["blocks"][0]["latest_verdict"]["action"] == "spray"
    assert resp.data["setup"]["counts"]["verdicts"] == 1
    assert "recent_captures" in resp.data
    assert "frac_program" in resp.data
    assert "pilot_savings" in resp.data
    assert resp.data["pilot_savings"]["headline"]


def test_dashboard_summary_includes_recent_captures(
    auth_client,
    make_org,
    make_membership,
    make_user,
):
    client, user = auth_client()
    org = make_org(name="Capture Org")
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    vineyard = Vineyard.objects.create(org=org, name="V", region=org.region)
    block = Block.objects.create(vineyard=vineyard, name="B", geom=_polygon())
    Capture.objects.create(
        block=block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key=f"{org.id}/{block.id}/dash-cap.jpg",
        status=Capture.Status.UPLOADED,
    )

    resp = client.get(f"/api/spray/orgs/{org.id}/dashboard-summary")

    assert resp.status_code == 200
    assert "recent_captures" in resp.data
    assert len(resp.data["recent_captures"]) == 1
    assert resp.data["recent_captures"][0]["block_id"] == str(block.id)


def test_dashboard_summary_rejects_cross_org(auth_client, make_org, make_membership, make_user):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    other_client, _ = auth_client(make_user())

    resp = other_client.get(f"/api/spray/orgs/{org.id}/dashboard-summary")

    assert resp.status_code in (403, 404)
