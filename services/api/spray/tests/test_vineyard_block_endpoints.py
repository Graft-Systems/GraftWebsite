"""Vineyard + Block endpoint tests (M0-03 step 11)."""

from __future__ import annotations

import pytest

from spray.models import Block, DataLakeEvent, Membership, Vineyard


pytestmark = pytest.mark.django_db


# Reusable GeoJSON shapes in EPSG:4326 (Napa Valley-ish).
POLYGON_A = {
    "type": "Polygon",
    "coordinates": [
        [
            [-122.30, 38.30],
            [-122.30, 38.31],
            [-122.29, 38.31],
            [-122.29, 38.30],
            [-122.30, 38.30],
        ]
    ],
}
POINT_A = {"type": "Point", "coordinates": [-122.295, 38.305]}
# Disjoint from POLYGON_A — append merge should yield MultiPolygon.
POLYGON_B = {
    "type": "Polygon",
    "coordinates": [
        [
            [-122.28, 38.30],
            [-122.28, 38.31],
            [-122.27, 38.31],
            [-122.27, 38.30],
            [-122.28, 38.30],
        ]
    ],
}


def _setup_owner(auth_client, make_org, make_membership):
    """Sign in a user and make them OWNER of a fresh Org. Returns (client, user, org)."""
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    return client, user, org


def _setup_member(auth_client, make_org, make_membership, role=Membership.Role.MEMBER):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=role)
    return client, user, org


# ---------- Vineyard ----------


def test_create_vineyard_owner_succeeds(auth_client, make_org, make_membership):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/vineyards",
        {"name": "Klein Estate", "region": "napa", "centroid": POINT_A},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    vineyard = Vineyard.objects.unscoped().get(id=resp.data["id"])
    assert vineyard.org == org
    assert vineyard.name == "Klein Estate"
    assert DataLakeEvent.objects.unscoped().filter(
        category="vineyard.created"
    ).exists()


def test_create_vineyard_viewer_denied(auth_client, make_org, make_membership):
    client, _, org = _setup_member(
        auth_client, make_org, make_membership, role=Membership.Role.VIEWER
    )
    resp = client.post(
        f"/api/spray/orgs/{org.id}/vineyards",
        {"name": "X", "region": "napa"},
        format="json",
    )
    assert resp.status_code == 403


def test_list_vineyards_filters_by_org(
    auth_client, make_org, make_membership, make_user
):
    client, user, org = _setup_owner(auth_client, make_org, make_membership)
    # Vineyard in this org.
    Vineyard.objects.unscoped().create(org=org, name="Mine")
    # Vineyard in some OTHER org.
    other_org = make_org(name="Other")
    Vineyard.objects.unscoped().create(org=other_org, name="Theirs")

    resp = client.get(f"/api/spray/orgs/{org.id}/vineyards")
    assert resp.status_code == 200
    names = [v["name"] for v in resp.data]
    assert "Mine" in names
    assert "Theirs" not in names


def test_list_vineyards_includes_block_count(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v_empty = Vineyard.objects.unscoped().create(org=org, name="Empty")
    v_blocks = Vineyard.objects.unscoped().create(org=org, name="HasBlocks")
    from django.contrib.gis.geos import GEOSGeometry
    import json

    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    Block.objects.unscoped().create(vineyard=v_blocks, name="B1", geom=geom)
    Block.objects.unscoped().create(vineyard=v_blocks, name="B2", geom=geom)

    resp = client.get(f"/api/spray/orgs/{org.id}/vineyards")
    assert resp.status_code == 200
    by_name = {row["name"]: row["block_count"] for row in resp.data}
    assert by_name["Empty"] == 0
    assert by_name["HasBlocks"] == 2


def test_patch_vineyard_member_succeeds(auth_client, make_org, make_membership):
    client, _, org = _setup_member(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="Old")
    resp = client.patch(
        f"/api/spray/orgs/{org.id}/vineyards/{v.id}",
        {"name": "New"},
        format="json",
    )
    assert resp.status_code == 200
    v.refresh_from_db()
    assert v.name == "New"


def test_delete_vineyard_owner_archives_with_blocks(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    from django.contrib.gis.geos import GEOSGeometry
    import json
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    Block.objects.unscoped().create(vineyard=v, name="B1", geom=geom)

    resp = client.delete(f"/api/spray/orgs/{org.id}/vineyards/{v.id}")
    assert resp.status_code == 204
    v.refresh_from_db()
    assert v.archived_at is not None
    assert (
        Block.objects.unscoped()
        .filter(vineyard=v, archived_at__isnull=False)
        .count()
        == 1
    )


def test_delete_vineyard_member_denied(auth_client, make_org, make_membership):
    client, _, org = _setup_member(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    resp = client.delete(f"/api/spray/orgs/{org.id}/vineyards/{v.id}")
    assert resp.status_code == 403


# ---------- Block ----------


def test_create_block_with_geojson_polygon(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    resp = client.post(
        f"/api/spray/orgs/{org.id}/vineyards/{v.id}/blocks",
        {
            "name": "Block 1",
            "geom": POLYGON_A,
            "variety": "Cabernet",
            "row_spacing_m": "2.13",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    block = Block.objects.unscoped().get(id=resp.data["id"])
    assert block.vineyard == v
    assert block.geom is not None


def test_create_block_invalid_geometry_400(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    resp = client.post(
        f"/api/spray/orgs/{org.id}/vineyards/{v.id}/blocks",
        {"name": "Bad", "geom": "NOT A GEOMETRY"},
        format="json",
    )
    assert resp.status_code == 400


def test_block_returns_geojson(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    from django.contrib.gis.geos import GEOSGeometry
    import json
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    block = Block.objects.unscoped().create(vineyard=v, name="B1", geom=geom)

    resp = client.get(f"/api/spray/orgs/{org.id}/blocks/{block.id}")
    assert resp.status_code == 200
    assert resp.data["geom"]["type"] == "MultiPolygon"


def test_block_list_excludes_archived(auth_client, make_org, make_membership):
    from django.contrib.gis.geos import GEOSGeometry
    from django.utils import timezone
    import json

    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    live = Block.objects.unscoped().create(vineyard=v, name="Live", geom=geom)
    Block.objects.unscoped().create(
        vineyard=v, name="Archived", geom=geom, archived_at=timezone.now()
    )

    resp = client.get(
        f"/api/spray/orgs/{org.id}/vineyards/{v.id}/blocks"
    )
    assert resp.status_code == 200
    names = [b["name"] for b in resp.data]
    assert "Live" in names
    assert "Archived" not in names
    assert resp.data[0]["id"] == str(live.id)


def test_block_admin_can_archive(auth_client, make_org, make_membership):
    from django.contrib.gis.geos import GEOSGeometry
    import json

    client, _, org = _setup_member(
        auth_client, make_org, make_membership, role=Membership.Role.ADMIN
    )
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    block = Block.objects.unscoped().create(vineyard=v, name="B", geom=geom)

    resp = client.delete(f"/api/spray/orgs/{org.id}/blocks/{block.id}")
    assert resp.status_code == 204
    block.refresh_from_db()
    assert block.archived_at is not None


def test_block_member_cannot_archive(auth_client, make_org, make_membership):
    from django.contrib.gis.geos import GEOSGeometry
    import json

    client, _, org = _setup_member(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    block = Block.objects.unscoped().create(vineyard=v, name="B", geom=geom)

    resp = client.delete(f"/api/spray/orgs/{org.id}/blocks/{block.id}")
    assert resp.status_code == 403


def test_cross_org_vineyard_404(auth_client, make_org, make_membership):
    client, _, org_a = _setup_owner(auth_client, make_org, make_membership)
    org_b = make_org(name="B")
    v_b = Vineyard.objects.unscoped().create(org=org_b, name="OtherOrg")

    # Caller has no membership in org_b; permission denies before 404.
    resp = client.get(f"/api/spray/orgs/{org_b.id}/vineyards/{v_b.id}")
    assert resp.status_code in (403, 404)


# ---------- DataLakeEvent emission ----------


def test_block_create_emits_lake_event(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    client.post(
        f"/api/spray/orgs/{org.id}/vineyards/{v.id}/blocks",
        {"name": "B1", "geom": POLYGON_A},
        format="json",
    )
    assert (
        DataLakeEvent.objects.unscoped()
        .filter(category="block.created", org=org)
        .count()
        == 1
    )


def test_block_patch_append_geom_merges_footprint(
    auth_client, make_org, make_membership
):
    from django.db import connection

    if connection.vendor != "postgresql":
        pytest.skip("append_geom merge requires PostGIS")

    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    from django.contrib.gis.geos import GEOSGeometry
    import json

    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    block = Block.objects.unscoped().create(vineyard=v, name="B1", geom=geom)

    resp = client.patch(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}",
        {"append_geom": POLYGON_B},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert resp.data["geom"]["type"] == "MultiPolygon"
    block.refresh_from_db()
    assert block.geom.geom_type == "MultiPolygon"


def test_block_patch_geom_and_append_mutually_exclusive(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_owner(auth_client, make_org, make_membership)
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    from django.contrib.gis.geos import GEOSGeometry
    import json

    geom = GEOSGeometry(json.dumps(POLYGON_A), srid=4326)
    block = Block.objects.unscoped().create(vineyard=v, name="B1", geom=geom)

    resp = client.patch(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}",
        {"geom": POLYGON_A, "append_geom": POLYGON_B},
        format="json",
    )
    assert resp.status_code == 400
