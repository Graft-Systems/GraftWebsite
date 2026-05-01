"""DRF permission class tests (M0-02 step 10)."""

from __future__ import annotations

import pytest
from rest_framework.test import APIRequestFactory

from spray.models import Membership
from spray.permissions import (
    IsAuthenticatedSpray,
    IsOrgAdmin,
    IsOrgMember,
    IsOrgOwner,
    IsOrgViewer,
)


pytestmark = pytest.mark.django_db


class _FakeView:
    def __init__(self, org_id: str | None):
        self.kwargs = {"org_id": org_id} if org_id else {}


def _req(user, *, body: dict | None = None):
    factory = APIRequestFactory()
    from rest_framework.parsers import JSONParser
    from rest_framework.request import Request

    raw = factory.post("/", body or {}, format="json")
    request = Request(raw, parsers=[JSONParser()])
    request.user = user
    return request


@pytest.mark.parametrize(
    "role,perm,expected",
    [
        (Membership.Role.OWNER, IsOrgViewer, True),
        (Membership.Role.ADMIN, IsOrgViewer, True),
        (Membership.Role.MEMBER, IsOrgViewer, True),
        (Membership.Role.VIEWER, IsOrgViewer, True),
        (Membership.Role.OWNER, IsOrgMember, True),
        (Membership.Role.ADMIN, IsOrgMember, True),
        (Membership.Role.MEMBER, IsOrgMember, True),
        (Membership.Role.VIEWER, IsOrgMember, False),
        (Membership.Role.OWNER, IsOrgAdmin, True),
        (Membership.Role.ADMIN, IsOrgAdmin, True),
        (Membership.Role.MEMBER, IsOrgAdmin, False),
        (Membership.Role.VIEWER, IsOrgAdmin, False),
        (Membership.Role.OWNER, IsOrgOwner, True),
        (Membership.Role.ADMIN, IsOrgOwner, False),
        (Membership.Role.MEMBER, IsOrgOwner, False),
        (Membership.Role.VIEWER, IsOrgOwner, False),
    ],
)
def test_role_matrix(make_user, make_org, make_membership, role, perm, expected):
    user = make_user()
    org = make_org()
    make_membership(user=user, org=org, role=role)
    request = _req(user)
    view = _FakeView(str(org.id))
    assert perm().has_permission(request, view) is expected


def test_no_membership_denies_all(make_user, make_org):
    user = make_user()
    org = make_org()
    request = _req(user)
    view = _FakeView(str(org.id))
    for perm in (IsOrgViewer, IsOrgMember, IsOrgAdmin, IsOrgOwner):
        assert perm().has_permission(request, view) is False


def test_authenticated_check_blocks_deleted_user(make_user):
    from django.utils import timezone

    user = make_user()
    user.deleted_at = timezone.now()
    user.save()
    request = _req(user)
    view = _FakeView(None)
    assert IsAuthenticatedSpray().has_permission(request, view) is False


def test_org_id_resolves_from_body(make_user, make_org, make_membership):
    user = make_user()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    request = _req(user, body={"org_id": str(org.id)})
    view = _FakeView(None)
    assert IsOrgOwner().has_permission(request, view) is True
