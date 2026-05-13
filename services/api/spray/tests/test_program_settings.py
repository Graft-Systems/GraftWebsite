"""Grower program settings tests."""

from __future__ import annotations

import pytest

from spray.models import Membership


pytestmark = pytest.mark.django_db


def test_program_settings_patch_persists_to_org_settings(
    auth_client,
    make_org,
    make_membership,
):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)

    resp = client.patch(
        f"/api/spray/orgs/{org.id}/program-settings",
        {
            "program_type": "conventional",
            "allowed_products": "Product A, Product B",
            "max_wind_mph": 8,
        },
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["program_type"] == "conventional"
    assert resp.data["max_wind_mph"] == 8
    org.refresh_from_db()
    assert org.settings["spray_program"]["allowed_products"] == "Product A, Product B"


def test_program_settings_viewer_cannot_patch(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.VIEWER)

    resp = client.patch(
        f"/api/spray/orgs/{org.id}/program-settings",
        {"program_type": "conventional"},
        format="json",
    )

    assert resp.status_code == 403
