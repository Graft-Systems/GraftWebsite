"""Spray record endpoint tests."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.gis.geos import Polygon
from django.utils import timezone

from spray.models import Block, BlockVerdict, Membership, SprayRecord, Vineyard


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
    vineyard = Vineyard.objects.create(org=org, name="Estate", region=org.region)
    block = Block.objects.create(vineyard=vineyard, name="North", geom=_polygon())
    return client, org, block


def test_create_and_list_spray_record(auth_client, make_org, make_membership):
    client, org, block = _setup(auth_client, make_org, make_membership)

    resp = client.post(
        f"/api/spray/orgs/{org.id}/spray-records",
        {
            "block": str(block.id),
            "applied_at": timezone.now().isoformat(),
            "product": "Sulfur",
            "rate": "label rate",
            "target_disease": "powdery",
            "rei_hours": 24,
            "phi_days": 0,
            "applicator": "Field crew",
            "notes": "Morning application.",
        },
        format="json",
    )

    assert resp.status_code == 201, resp.data
    assert resp.data["block_name"] == "North"
    assert SprayRecord.objects.for_org(org).filter(block=block, product="Sulfur").exists()

    list_resp = client.get(f"/api/spray/orgs/{org.id}/spray-records")
    assert list_resp.status_code == 200
    assert list_resp.data["results"][0]["product"] == "Sulfur"


def test_spray_record_rejects_cross_org_block(
    auth_client,
    make_org,
    make_membership,
):
    client, org, _ = _setup(auth_client, make_org, make_membership)
    other_org = make_org(name="Other")
    other_vineyard = Vineyard.objects.create(
        org=other_org,
        name="Other",
        region=other_org.region,
    )
    other_block = Block.objects.create(
        vineyard=other_vineyard,
        name="Other Block",
        geom=_polygon(),
    )

    resp = client.post(
        f"/api/spray/orgs/{org.id}/spray-records",
        {
            "block": str(other_block.id),
            "applied_at": timezone.now().isoformat(),
            "product": "Sulfur",
            "target_disease": "powdery",
        },
        format="json",
    )

    assert resp.status_code in (400, 404)


def test_spray_record_rejects_cross_org_verdict(
    auth_client,
    make_org,
    make_membership,
):
    client, org, block = _setup(auth_client, make_org, make_membership)
    other_org = make_org(name="Other")
    other_vineyard = Vineyard.objects.create(
        org=other_org,
        name="Other",
        region=other_org.region,
    )
    other_block = Block.objects.create(
        vineyard=other_vineyard,
        name="Other Block",
        geom=_polygon(),
    )
    other_verdict = _verdict(other_block)

    resp = client.post(
        f"/api/spray/orgs/{org.id}/spray-records",
        {
            "block": str(block.id),
            "verdict": str(other_verdict.id),
            "applied_at": timezone.now().isoformat(),
            "product": "Sulfur",
            "target_disease": "powdery",
        },
        format="json",
    )

    assert resp.status_code in (400, 404)


def test_spray_record_filters_by_block_vineyard_and_date(
    auth_client,
    make_org,
    make_membership,
):
    client, org, block = _setup(auth_client, make_org, make_membership)
    other_vineyard = Vineyard.objects.create(org=org, name="Bench", region=org.region)
    other_block = Block.objects.create(
        vineyard=other_vineyard,
        name="South",
        geom=_polygon(),
    )
    SprayRecord.objects.create(
        block=block,
        applied_at=timezone.now() - timedelta(days=2),
        product="Sulfur",
        target_disease="powdery",
    )
    SprayRecord.objects.create(
        block=other_block,
        applied_at=timezone.now(),
        product="Copper",
        target_disease="downy",
    )

    block_resp = client.get(
        f"/api/spray/orgs/{org.id}/spray-records?block_id={block.id}"
    )
    vineyard_resp = client.get(
        f"/api/spray/orgs/{org.id}/spray-records?vineyard_id={other_vineyard.id}"
    )
    today = timezone.now().date().isoformat()
    date_resp = client.get(
        f"/api/spray/orgs/{org.id}/spray-records?date_from={today}&date_to={today}"
    )

    assert [item["product"] for item in block_resp.data["results"]] == ["Sulfur"]
    assert [item["product"] for item in vineyard_resp.data["results"]] == ["Copper"]
    assert [item["product"] for item in date_resp.data["results"]] == ["Copper"]


def test_delete_archives_spray_record(auth_client, make_org, make_membership):
    client, org, block = _setup(auth_client, make_org, make_membership)
    record = SprayRecord.objects.create(
        block=block,
        applied_at=timezone.now(),
        product="Sulfur",
        target_disease="powdery",
    )

    resp = client.delete(f"/api/spray/orgs/{org.id}/spray-records/{record.id}")

    assert resp.status_code == 204
    record.refresh_from_db()
    assert record.archived_at is not None
    list_resp = client.get(f"/api/spray/orgs/{org.id}/spray-records")
    assert list_resp.data["results"] == []


def _verdict(block: Block) -> BlockVerdict:
    return BlockVerdict.objects.create(
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
        forecast_7d=[],
        advisory_events=[],
        model_versions={"demo": "1"},
        generated_at=timezone.now(),
        audit_hash="sha256:" + ("a" * 64),
    )
