"""Org and Membership endpoint tests (M0-02 step 10).

Hits each route through the DRF test client w/ Clerk JWTs minted by the
mock_jwks fixture. Covers the happy path plus role-based denial.
"""

from __future__ import annotations

import pytest

from spray.models import AuthEvent, Membership, Org


pytestmark = pytest.mark.django_db


def test_create_org_makes_caller_owner(auth_client):
    client, user = auth_client()
    resp = client.post(
        "/api/spray/orgs",
        {"name": "Klein Vineyards", "region": "napa"},
        format="json",
    )
    assert resp.status_code == 201
    org_id = resp.data["id"]
    org = Org.objects.get(id=org_id)
    assert Membership.objects.filter(
        org=org, user=user, role=Membership.Role.OWNER
    ).exists()
    assert AuthEvent.objects.filter(
        user=user, org=org, type=AuthEvent.Type.ORG_CREATED
    ).exists()


def test_my_orgs_returns_callers_memberships(
    auth_client, make_org, make_membership
):
    client, user = auth_client()
    org = make_org(name="A")
    other = make_org(name="B")
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    resp = client.get("/api/spray/orgs/me")
    assert resp.status_code == 200
    names = [m["org"]["name"] for m in resp.data["memberships"]]
    assert "A" in names
    assert "B" not in names


def test_org_detail_get_requires_membership(
    auth_client, make_org
):
    client, _ = auth_client()
    org = make_org()
    resp = client.get(f"/api/spray/orgs/{org.id}")
    assert resp.status_code == 403


def test_org_detail_patch_admin_succeeds(
    auth_client, make_org, make_membership
):
    client, user = auth_client()
    org = make_org(name="Old")
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    resp = client.patch(
        f"/api/spray/orgs/{org.id}", {"name": "New"}, format="json"
    )
    assert resp.status_code == 200
    org.refresh_from_db()
    assert org.name == "New"


def test_org_detail_patch_member_denied(
    auth_client, make_org, make_membership
):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.MEMBER)
    resp = client.patch(
        f"/api/spray/orgs/{org.id}", {"name": "X"}, format="json"
    )
    assert resp.status_code == 403


def test_org_delete_archives(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.OWNER)
    resp = client.delete(f"/api/spray/orgs/{org.id}")
    assert resp.status_code == 204
    org.refresh_from_db()
    assert org.archived_at is not None


def test_org_delete_admin_denied(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    resp = client.delete(f"/api/spray/orgs/{org.id}")
    assert resp.status_code == 403


def test_invite_existing_user(
    auth_client, make_org, make_membership, make_user
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    invitee = make_user(email="invitee@example.com")
    resp = client.post(
        f"/api/spray/orgs/{org.id}/invite",
        {"email": "invitee@example.com", "role": "MEMBER"},
        format="json",
    )
    assert resp.status_code == 201
    assert Membership.objects.filter(org=org, user=invitee).exists()


def test_invite_unknown_email_returns_404(
    auth_client, make_org, make_membership
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    resp = client.post(
        f"/api/spray/orgs/{org.id}/invite",
        {"email": "nobody@example.com", "role": "MEMBER"},
        format="json",
    )
    assert resp.status_code == 404


def test_invite_member_denied(auth_client, make_org, make_membership, make_user):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.MEMBER)
    target = make_user(email="x@x.com")
    resp = client.post(
        f"/api/spray/orgs/{org.id}/invite",
        {"email": "x@x.com", "role": "MEMBER"},
        format="json",
    )
    assert resp.status_code == 403


def test_role_change_blocks_demoting_last_owner(
    auth_client, make_org, make_membership
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    resp = client.patch(
        f"/api/spray/orgs/{org.id}/memberships/{owner.id}",
        {"role": "ADMIN"},
        format="json",
    )
    assert resp.status_code == 409


def test_role_change_promotes_admin_to_owner(
    auth_client, make_org, make_membership, make_user
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    other = make_user()
    make_membership(user=other, org=org, role=Membership.Role.ADMIN)
    resp = client.patch(
        f"/api/spray/orgs/{org.id}/memberships/{other.id}",
        {"role": "OWNER"},
        format="json",
    )
    assert resp.status_code == 200
    other_m = Membership.objects.get(org=org, user=other)
    assert other_m.role == Membership.Role.OWNER


def test_membership_list_member_can_read(
    auth_client, make_org, make_membership
):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.MEMBER)
    resp = client.get(f"/api/spray/orgs/{org.id}/memberships")
    assert resp.status_code == 200
    assert len(resp.data) == 1


def test_remove_member_owner_only(
    auth_client, make_org, make_membership, make_user
):
    client, owner = auth_client()
    org = make_org()
    make_membership(user=owner, org=org, role=Membership.Role.OWNER)
    other = make_user()
    make_membership(user=other, org=org, role=Membership.Role.MEMBER)
    resp = client.delete(
        f"/api/spray/orgs/{org.id}/memberships/{other.id}"
    )
    assert resp.status_code == 204
    assert not Membership.objects.filter(org=org, user=other).exists()


def test_unauthenticated_create_org_rejected(api_client):
    resp = api_client.post(
        "/api/spray/orgs", {"name": "X", "region": "napa"}, format="json"
    )
    assert resp.status_code in (401, 403)
