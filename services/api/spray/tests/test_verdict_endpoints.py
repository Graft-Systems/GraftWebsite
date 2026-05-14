"""Verdict endpoint tests — M1.5 PR-C."""

from __future__ import annotations

from datetime import date, timedelta

from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Polygon
from django.test import override_settings
from django.utils import timezone

from spray.models import Block, BlockVerdict, Membership, Vineyard


pytestmark = pytest.mark.django_db


def _polygon():
    return Polygon(
        ((-122.0, 38.0), (-122.0, 38.01), (-121.99, 38.01), (-121.99, 38.0), (-122.0, 38.0)),
        srid=4326,
    )


def _setup(auth_client, make_org, make_membership, role=Membership.Role.OWNER):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=role)
    vineyard = Vineyard.objects.unscoped().create(org=org, name="Test V")
    block = Block.objects.unscoped().create(
        vineyard=vineyard, name="B1", geom=_polygon()
    )
    return client, user, org, block


def _seed_verdict(block, *, target_date=None, action="hold", urgency="none"):
    return BlockVerdict.objects.unscoped().create(
        block=block,
        date=target_date or timezone.now().date(),
        powdery_severity_1_10=3.0,
        downy_severity_1_10=2.0,
        powdery_confidence=0.7,
        downy_confidence=0.7,
        action=action,
        urgency=urgency,
        drivers=[
            {
                "model": "gubler_thomas_2013",
                "value": 3.0,
                "threshold": 0.0,
                "citation_id": "06-S2",
                "weight": 0.5,
            }
        ],
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
        model_versions={"gubler_thomas_2013": "1.0.0"},
        generated_at=timezone.now(),
        audit_hash="sha256:" + ("a" * 64),
    )


def test_latest_verdict_returns_most_recent(auth_client, make_org, make_membership):
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    older = _seed_verdict(
        block, target_date=timezone.now().date() - timedelta(days=2)
    )
    newer = _seed_verdict(
        block, target_date=timezone.now().date(), action="spray", urgency="24h"
    )
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/latest"
    )
    assert resp.status_code == 200
    assert resp.data["id"] == str(newer.id)
    assert resp.data["action"] == "spray"
    assert resp.data["directive"]["risk_level"] == "low"
    assert resp.data["directive"]["when_to_spray"]
    assert resp.data["directive"]["what_to_spray"]
    assert resp.data["directive"]["where_to_spray"]
    assert resp.data["directive"]["when_not_to_spray"]


def test_latest_verdict_404_when_no_verdicts(
    auth_client, make_org, make_membership
):
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/latest"
    )
    assert resp.status_code == 404


def test_verdict_list_default_30_days(auth_client, make_org, make_membership):
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    today = timezone.now().date()
    _seed_verdict(block, target_date=today)
    _seed_verdict(block, target_date=today - timedelta(days=10))
    _seed_verdict(block, target_date=today - timedelta(days=40))  # outside default

    resp = client.get(f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts")
    assert resp.status_code == 200
    assert resp.data["count"] == 2


def test_verdict_list_with_since_param(auth_client, make_org, make_membership):
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    today = timezone.now().date()
    _seed_verdict(block, target_date=today)
    _seed_verdict(block, target_date=today - timedelta(days=5))

    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts"
        f"?since={(today - timedelta(days=2)).isoformat()}"
    )
    assert resp.status_code == 200
    assert resp.data["count"] == 1


def test_verdict_list_invalid_since_400(auth_client, make_org, make_membership):
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts?since=not-a-date"
    )
    assert resp.status_code == 400


def test_verdict_endpoints_deny_non_member(
    auth_client, make_org, make_membership, make_user
):
    # Create org + block with one user, attempt access with another (no membership).
    owner_client, owner, org, block = _setup(
        auth_client, make_org, make_membership
    )
    _seed_verdict(block)
    other_client, _ = auth_client(make_user())  # different user
    resp = other_client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/latest"
    )
    assert resp.status_code in (403, 404)


def test_viewer_role_can_read_verdicts(auth_client, make_org, make_membership):
    client, _, org, block = _setup(
        auth_client, make_org, make_membership, role=Membership.Role.VIEWER
    )
    _seed_verdict(block)
    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/latest"
    )
    assert resp.status_code == 200


@override_settings(SPRAY_VERDICT_RECOMPUTE_SYNC=True)
@patch("spray.aggregation.block_verdict_job.execute_compute_block_verdict")
def test_verdict_recompute_sync(mock_exec, auth_client, make_org, make_membership):
    mock_exec.return_value = True
    client, _, org, block = _setup(auth_client, make_org, make_membership)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/recompute",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sync"] is True
    assert body["ok"] is True
    mock_exec.assert_called_once()
