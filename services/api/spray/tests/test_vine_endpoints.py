"""Vine map node API tests."""

from __future__ import annotations

import pytest
from django.contrib.gis.geos import Point, Polygon

from spray.models import Block, Membership, Vine, Vineyard

pytestmark = pytest.mark.django_db


def _polygon():
    coords = (
        (-122.0, 38.0),
        (-122.0, 38.01),
        (-121.99, 38.01),
        (-121.99, 38.0),
        (-122.0, 38.0),
    )
    return Polygon(coords, srid=4326)


def _setup(auth_client, make_org, make_membership, role=Membership.Role.OWNER):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=role)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    b = Block.objects.unscoped().create(vineyard=v, name="B", geom=_polygon())
    return client, user, org, v, b


def test_list_vines_empty(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    res = client.get(f"/api/spray/orgs/{org.id}/blocks/{block.id}/vines")
    assert res.status_code == 200
    assert res.json() == []


def test_create_single_vine(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    res = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/vines",
        {
            "row_index": 3,
            "location": {"type": "Point", "coordinates": [-121.995, 38.005]},
        },
        format="json",
    )
    assert res.status_code == 201
    data = res.json()
    assert data["row_index"] == 3
    assert data["vine_index"] == 1
    assert data["status"] == "ok"
    assert Vine.objects.unscoped().filter(block=block, archived_at__isnull=True).count() == 1


def test_create_vine_outside_block_rejected(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    res = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/vines",
        {
            "row_index": 1,
            "location": {"type": "Point", "coordinates": [-121.5, 38.5]},
        },
        format="json",
    )
    assert res.status_code == 400


def test_bulk_row_creates_evenly_spaced_vines(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    res = client.post(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/vines/row",
        {
            "row_index": 4,
            "start": [-121.999, 38.002],
            "end": [-121.999, 38.008],
            "count": 4,
            "replace_row": True,
        },
        format="json",
    )
    assert res.status_code == 201
    vines = res.json()
    assert len(vines) == 4
    assert [v["vine_index"] for v in vines] == [1, 2, 3, 4]
    assert all(v["row_index"] == 4 for v in vines)


def test_patch_vine_status(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    vine = Vine.objects.unscoped().create(
        block=block,
        location=Point(-121.995, 38.005, srid=4326),
        row_index=1,
        vine_index=1,
    )
    res = client.patch(
        f"/api/spray/orgs/{org.id}/vines/{vine.id}",
        {"status": "alert"},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["status"] == "alert"


def test_delete_vine_archives(auth_client, make_org, make_membership):
    client, _, org, _, block = _setup(auth_client, make_org, make_membership)
    vine = Vine.objects.unscoped().create(
        block=block,
        location=Point(-121.995, 38.005, srid=4326),
        row_index=2,
        vine_index=1,
    )
    res = client.delete(f"/api/spray/orgs/{org.id}/vines/{vine.id}")
    assert res.status_code == 204
    vine.refresh_from_db()
    assert vine.archived_at is not None
