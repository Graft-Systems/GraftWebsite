"""Brief + audit-PDF endpoint tests (M1.5 PR-F.5 step 9)."""

from __future__ import annotations

import importlib.util
from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point, Polygon
from django.test import override_settings

from spray.models import (
    Block,
    BlockVerdict,
    DataLakeEvent,
    Membership,
    Vineyard,
)


pytestmark = pytest.mark.django_db
HAS_REPORTLAB = importlib.util.find_spec("reportlab") is not None


def _setup_viewer(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.VIEWER)
    return client, user, org


def _build_verdict(org):
    v = Vineyard.objects.create(
        org=org, name="V", region="napa", centroid=Point(-122.3, 38.3, srid=4326)
    )
    poly = Polygon(
        ((-122.3, 38.3), (-122.3, 38.31), (-122.29, 38.31), (-122.29, 38.3), (-122.3, 38.3)),
        srid=4326,
    )
    block = Block.objects.create(vineyard=v, name="B", geom=poly, variety="cab")
    verdict = BlockVerdict.objects.create(
        block=block,
        date=date(2026, 5, 7),
        powdery_severity_1_10=Decimal("7.2"),
        downy_severity_1_10=Decimal("3.1"),
        powdery_confidence=Decimal("0.85"),
        downy_confidence=Decimal("0.55"),
        action="spray",
        urgency="24h",
        drivers=[
            {
                "model": "gubler_thomas_2013",
                "value": 7.2,
                "threshold": 6.0,
                "citation_id": "GUBLER_2013",
                "weight": 0.5,
            }
        ],
        split_summary="",
        forecast_7d=[],
        advisory_events=[],
        model_versions={"gubler_thomas": "1.0.0"},
        generated_at=datetime(2026, 5, 7, 12, 0, tzinfo=timezone.utc),
        audit_hash="sha256:" + "a" * 64,
    )
    return block, verdict


# ---------------------------------------------------------------------
# Brief endpoint
# ---------------------------------------------------------------------


@override_settings(ANTHROPIC_API_KEY="", LLM_BRIEF_ENABLED=True)
def test_brief_endpoint_returns_fallback_envelope_when_no_key(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_viewer(auth_client, make_org, make_membership)
    block, verdict = _build_verdict(org)
    r = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/{verdict.id}/brief"
    )
    assert r.status_code == 200
    body = r.json()
    assert body["renderer"] == "deterministic_template@1.0.0"
    assert body["fallback_reason"] == "llm_disabled"
    # Telemetry never leaked to the client.
    assert "_telemetry" not in body


@override_settings(ANTHROPIC_API_KEY="", LLM_BRIEF_ENABLED=True)
def test_brief_endpoint_emits_lake_event(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_viewer(auth_client, make_org, make_membership)
    block, verdict = _build_verdict(org)
    client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/{verdict.id}/brief"
    )
    events = DataLakeEvent.objects.unscoped().filter(category="brief.rendered")
    assert events.count() == 1


# ---------------------------------------------------------------------
# Audit PDF endpoint
# ---------------------------------------------------------------------


@pytest.mark.skipif(not HAS_REPORTLAB, reason="reportlab not installed")
@override_settings(ANTHROPIC_API_KEY="", LLM_BRIEF_ENABLED=True)
def test_audit_pdf_returns_pdf(auth_client, make_org, make_membership):
    client, _, org = _setup_viewer(auth_client, make_org, make_membership)
    block, verdict = _build_verdict(org)
    r = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/verdicts/{verdict.id}/audit.pdf"
    )
    assert r.status_code == 200
    assert r["Content-Type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert "no-store" in r["Cache-Control"]


def test_audit_pdf_cross_org_returns_404(
    auth_client, make_org, make_membership, make_user
):
    user_a = make_user()
    org_a = make_org(name="A")
    Membership.objects.create(user=user_a, org=org_a, role=Membership.Role.OWNER)
    block, verdict = _build_verdict(org_a)

    client_b, _, _org_b = _setup_viewer(auth_client, make_org, make_membership)
    r = client_b.get(
        f"/api/spray/orgs/{org_a.id}/blocks/{block.id}/verdicts/{verdict.id}/audit.pdf"
    )
    assert r.status_code in (403, 404)
