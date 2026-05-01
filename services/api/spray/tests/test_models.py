"""Model layer tests for the spray app (M0-02 step 10)."""

from __future__ import annotations

import pytest
from django.db import IntegrityError

from spray.models import (
    AuthEvent,
    ConsentRecord,
    Membership,
    Org,
    Session,
    User,
)


pytestmark = pytest.mark.django_db


def test_org_defaults(make_org):
    org = make_org()
    assert org.plan == Org.Plan.FREE
    assert org.archived_at is None
    assert org.settings == {}


def test_user_is_authenticated_until_deleted(make_user):
    user = make_user()
    assert user.is_authenticated is True
    assert user.is_anonymous is False
    user.deleted_at = "2026-04-30T12:00:00Z"
    user.save()
    user.refresh_from_db()
    assert user.is_authenticated is False


def test_user_clerk_user_id_unique(make_user):
    user = make_user(clerk_user_id="user_abc")
    with pytest.raises(IntegrityError):
        User.objects.create(clerk_user_id="user_abc", email="dup@example.com")


def test_membership_unique_org_user(make_org, make_user, make_membership):
    org = make_org()
    user = make_user()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    with pytest.raises(IntegrityError):
        Membership.objects.create(
            user=user, org=org, role=Membership.Role.MEMBER
        )


def test_role_choices_complete():
    expected = {"OWNER", "ADMIN", "MEMBER", "VIEWER"}
    assert {r for r, _ in Membership.Role.choices} == expected


def test_consent_unique_user_category(make_user):
    user = make_user()
    ConsentRecord.objects.create(
        user=user,
        category=ConsentRecord.Category.PHOTO_FOR_TRAINING,
        granted=True,
    )
    with pytest.raises(IntegrityError):
        ConsentRecord.objects.create(
            user=user,
            category=ConsentRecord.Category.PHOTO_FOR_TRAINING,
            granted=False,
        )


def test_authevent_user_nullable(make_user):
    """AuthEvent uses SET_NULL so deleted users do not erase audit rows."""
    user = make_user()
    evt = AuthEvent.objects.create(user=user, type=AuthEvent.Type.SIGN_UP)
    user.delete()
    evt.refresh_from_db()
    assert evt.user is None
    assert evt.type == AuthEvent.Type.SIGN_UP


def test_session_revoked_at_default(make_user):
    user = make_user()
    s = Session.objects.create(user=user, clerk_session_id="sess_1")
    assert s.revoked_at is None
