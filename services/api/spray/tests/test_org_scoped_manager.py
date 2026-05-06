"""OrgScopedManager + queryset enforcement tests (M0-03)."""

from __future__ import annotations

import pytest

from spray.managers import OrgScopeRequiredError
from spray.models import Block, DataLakeEvent, Vineyard


pytestmark = pytest.mark.django_db


def _make_polygon(offset: float = 0.0):
    from django.contrib.gis.geos import Polygon

    coords = (
        (-122.0 + offset, 38.0 + offset),
        (-122.0 + offset, 38.01 + offset),
        (-121.99 + offset, 38.01 + offset),
        (-121.99 + offset, 38.0 + offset),
        (-122.0 + offset, 38.0 + offset),
    )
    return Polygon(coords, srid=4326)


def test_unscoped_iteration_raises(make_org):
    org = make_org()
    Vineyard.objects.unscoped().create(org=org, name="Solo")

    with pytest.raises(OrgScopeRequiredError):
        list(Vineyard.objects.all())


def test_for_org_filters(make_org):
    org_a = make_org(name="A")
    org_b = make_org(name="B")
    Vineyard.objects.unscoped().create(org=org_a, name="Aside")
    Vineyard.objects.unscoped().create(org=org_b, name="Bside")

    a = list(Vineyard.objects.for_org(org_a))
    assert len(a) == 1
    assert a[0].name == "Aside"


def test_unscoped_escape_hatch(make_org):
    org_a = make_org(name="A")
    org_b = make_org(name="B")
    Vineyard.objects.unscoped().create(org=org_a, name="Aside")
    Vineyard.objects.unscoped().create(org=org_b, name="Bside")

    assert Vineyard.objects.unscoped().count() == 2


def test_block_via_traverses_vineyard_org(make_org):
    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    Block.objects.unscoped().create(
        vineyard=v, name="B1", geom=_make_polygon()
    )
    blocks = list(Block.objects.for_org(org))
    assert len(blocks) == 1


def test_data_lake_event_scope_required(make_org, make_user):
    org = make_org()
    user = make_user()
    DataLakeEvent.objects.unscoped().create(
        org=org, user=user, category="vineyard.created", schema_version="0.1"
    )
    with pytest.raises(OrgScopeRequiredError):
        DataLakeEvent.objects.all().count()
