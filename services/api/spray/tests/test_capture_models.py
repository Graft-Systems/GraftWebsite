"""Capture model tests (M1-09)."""

from __future__ import annotations

import pytest
from django.contrib.gis.geos import Polygon
from django.db import IntegrityError

from spray.managers import OrgScopeRequiredError
from spray.models import Block, Capture, Vineyard


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


def _setup(make_org):
    org = make_org()
    v = Vineyard.objects.unscoped().create(org=org, name="V")
    b = Block.objects.unscoped().create(vineyard=v, name="B", geom=_polygon())
    return org, b


def test_capture_default_status_pending(make_org, make_user):
    _, block = _setup(make_org)
    user = make_user()
    c = Capture.objects.unscoped().create(
        block=block,
        uploader=user,
        kind=Capture.Kind.PHOTO,
        s3_key="org-id/block-id/cap1.jpg",
    )
    assert c.status == Capture.Status.PENDING
    assert c.uploaded_at is None


def test_capture_s3_key_unique(make_org, make_user):
    _, block = _setup(make_org)
    user = make_user()
    Capture.objects.unscoped().create(
        block=block, uploader=user, kind=Capture.Kind.PHOTO,
        s3_key="dup-key",
    )
    with pytest.raises(IntegrityError):
        Capture.objects.unscoped().create(
            block=block, uploader=user, kind=Capture.Kind.PHOTO,
            s3_key="dup-key",
        )


def test_capture_org_scope_required(make_org, make_user):
    _, block = _setup(make_org)
    user = make_user()
    Capture.objects.unscoped().create(
        block=block, uploader=user, kind=Capture.Kind.PHOTO,
        s3_key="org-id/block-id/scope.jpg",
    )
    with pytest.raises(OrgScopeRequiredError):
        list(Capture.objects.all())


def test_capture_for_org_traverses_block_vineyard(make_org, make_user):
    org, block = _setup(make_org)
    user = make_user()
    Capture.objects.unscoped().create(
        block=block, uploader=user, kind=Capture.Kind.PHOTO,
        s3_key="org-id/block-id/visible.jpg",
    )
    assert Capture.objects.for_org(org).count() == 1


def test_capture_archive_sets_archived_at(make_org, make_user):
    from django.utils import timezone

    _, block = _setup(make_org)
    user = make_user()
    c = Capture.objects.unscoped().create(
        block=block, uploader=user, kind=Capture.Kind.PHOTO,
        s3_key="org-id/block-id/arc.jpg",
    )
    c.archived_at = timezone.now()
    c.save()
    assert c.archived_at is not None
