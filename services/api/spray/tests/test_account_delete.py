"""Account lifecycle + consent tests (M0-02 step 10)."""

from __future__ import annotations

import pytest

from spray.models import AuthEvent, ConsentRecord, Membership, Org


pytestmark = pytest.mark.django_db


def test_delete_requires_confirm_true(auth_client):
    client, _ = auth_client()
    resp = client.post(
        "/api/spray/account/delete", {"confirm": False}, format="json"
    )
    assert resp.status_code == 400


def test_delete_soft_deletes_user_and_records_event(auth_client):
    client, user = auth_client()
    resp = client.post(
        "/api/spray/account/delete", {"confirm": True}, format="json"
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.deleted_at is not None
    assert AuthEvent.objects.filter(
        user=user, type=AuthEvent.Type.ACCOUNT_DELETION_REQUESTED
    ).exists()


def test_delete_archives_solo_owned_org(
    auth_client, make_org, make_membership
):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    resp = client.post(
        "/api/spray/account/delete", {"confirm": True}, format="json"
    )
    assert resp.status_code == 200
    org.refresh_from_db()
    assert org.archived_at is not None


def test_delete_blocked_when_other_members_exist(
    auth_client, make_org, make_membership, make_user
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    other = make_user()
    make_membership(user=other, org=org, role=Membership.Role.MEMBER)
    resp = client.post(
        "/api/spray/account/delete", {"confirm": True}, format="json"
    )
    assert resp.status_code == 409
    owner.refresh_from_db()
    assert owner.deleted_at is None


def test_export_returns_user_payload(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org(name="Export Co")
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    resp = client.post("/api/spray/account/export", {}, format="json")
    assert resp.status_code == 200
    assert resp.data["user"]["id"] == str(user.id)
    assert any(
        m["org"]["name"] == "Export Co" for m in resp.data["memberships"]
    )


def test_consent_get_empty(auth_client):
    client, _ = auth_client()
    resp = client.get("/api/spray/account/consent")
    assert resp.status_code == 200
    assert resp.data == []


def test_consent_post_upserts_and_emits_events(auth_client):
    client, user = auth_client()
    resp = client.post(
        "/api/spray/account/consent",
        [
            {"category": "photo_for_training", "granted": True},
            {"category": "marketing_email", "granted": False},
        ],
        format="json",
    )
    assert resp.status_code == 200
    assert ConsentRecord.objects.filter(
        user=user, category="photo_for_training", granted=True
    ).exists()
    assert AuthEvent.objects.filter(
        user=user, type=AuthEvent.Type.CONSENT_GRANTED
    ).count() == 1
    assert AuthEvent.objects.filter(
        user=user, type=AuthEvent.Type.CONSENT_WITHDRAWN
    ).count() == 1


def test_consent_post_toggle_off_then_on(auth_client):
    client, user = auth_client()
    client.post(
        "/api/spray/account/consent",
        [{"category": "photo_for_training", "granted": True}],
        format="json",
    )
    client.post(
        "/api/spray/account/consent",
        [{"category": "photo_for_training", "granted": False}],
        format="json",
    )
    record = ConsentRecord.objects.get(
        user=user, category="photo_for_training"
    )
    assert record.granted is False
    assert record.withdrawn_at is not None


def test_consent_post_requires_array(auth_client):
    client, _ = auth_client()
    resp = client.post(
        "/api/spray/account/consent",
        {"category": "photo_for_training", "granted": True},
        format="json",
    )
    assert resp.status_code == 400
