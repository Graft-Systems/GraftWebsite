"""Vineyard.centroid recompute signal tests (M0-05 step 6)."""

from __future__ import annotations

import json

import pytest
from django.contrib.gis.geos import GEOSGeometry, Polygon

from spray.models import Block, Vineyard


pytestmark = pytest.mark.django_db(transaction=True)
# transaction=True so post-save's transaction.on_commit hook actually
# fires (default django_db wraps each test in a non-committed
# transaction which suppresses on_commit callbacks).


def _polygon(offset: float = 0.0):
    coords = (
        (-122.0 + offset, 38.0 + offset),
        (-122.0 + offset, 38.01 + offset),
        (-121.99 + offset, 38.01 + offset),
        (-121.99 + offset, 38.0 + offset),
        (-122.0 + offset, 38.0 + offset),
    )
    return Polygon(coords, srid=4326)


def test_centroid_none_when_no_blocks(make_org):
    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    v.refresh_from_db()
    assert v.centroid is None


def test_centroid_set_after_block_created(make_org):
    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    Block.objects.unscoped().create(vineyard=v, name="B1", geom=_polygon())
    v.refresh_from_db()
    assert v.centroid is not None
    assert -122.001 < v.centroid.x < -121.989
    assert 37.999 < v.centroid.y < 38.011


def test_centroid_recomputes_after_block_archived(make_org):
    from django.utils import timezone

    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    b1 = Block.objects.unscoped().create(vineyard=v, name="B1", geom=_polygon())
    Block.objects.unscoped().create(
        vineyard=v, name="B2", geom=_polygon(offset=0.1)
    )

    v.refresh_from_db()
    centroid_with_two = v.centroid

    b1.archived_at = timezone.now()
    b1.save()

    v.refresh_from_db()
    assert v.centroid is not None
    # Centroid should have shifted toward B2 (the offset polygon).
    assert v.centroid.x != centroid_with_two.x or v.centroid.y != centroid_with_two.y
    assert v.centroid.x > centroid_with_two.x  # B2 is offset NE


def test_centroid_back_to_none_when_all_blocks_archived(make_org):
    from django.utils import timezone

    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    b = Block.objects.unscoped().create(vineyard=v, name="B", geom=_polygon())

    v.refresh_from_db()
    assert v.centroid is not None

    b.archived_at = timezone.now()
    b.save()

    v.refresh_from_db()
    assert v.centroid is None
