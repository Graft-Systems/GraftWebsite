"""Spray record endpoint tests."""

from __future__ import annotations

import pytest
from django.contrib.gis.geos import Polygon
from django.utils import timezone

from spray.models import Block, Membership, SprayRecord, Vineyard


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
    assert SprayRecord.objects.filter(block=block, product="Sulfur").exists()

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
