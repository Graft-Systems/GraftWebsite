"""Davis + METER paste-key connect endpoint tests (M1.5 PR-E step 8)."""

from __future__ import annotations

import pytest
import responses
from cryptography.fernet import Fernet
from django.test import override_settings

from spray.models import IntegrationConnection, Membership


pytestmark = pytest.mark.django_db
TEST_KEY = Fernet.generate_key().decode()
DAVIS_BASE = "https://api.weatherlink.com/v2"
METER_BASE = "https://zentracloud.com/api/v4"


def _setup_admin(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    return client, user, org


# ---------------------------------------------------------------------
# Davis
# ---------------------------------------------------------------------


@override_settings(
    SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY,
    DAVIS_API_BASE=DAVIS_BASE,
)
@responses.activate
def test_davis_connect_happy_path(auth_client, make_org, make_membership):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"stations": [{"station_id": 42, "station_name": "Test"}]},
        status=200,
    )
    r = client.post(
        f"/api/spray/orgs/{org.id}/integrations/davis/connect",
        {"api_key": "K", "api_secret": "S"},
        format="json",
    )
    assert r.status_code in (200, 201)
    assert IntegrationConnection.objects.for_org(org).filter(vendor="davis").exists()


@override_settings(
    SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY,
    DAVIS_API_BASE=DAVIS_BASE,
)
@responses.activate
def test_davis_connect_smoke_failure_surfaces_400(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    responses.add(
        responses.GET, f"{DAVIS_BASE}/stations", status=401
    )
    r = client.post(
        f"/api/spray/orgs/{org.id}/integrations/davis/connect",
        {"api_key": "bad", "api_secret": "bad"},
        format="json",
    )
    assert r.status_code == 400
    assert not IntegrationConnection.objects.for_org(org).filter(vendor="davis").exists()


def test_davis_connect_missing_fields_400(auth_client, make_org, make_membership):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    r = client.post(
        f"/api/spray/orgs/{org.id}/integrations/davis/connect",
        {"api_key": "x"},
        format="json",
    )
    assert r.status_code == 400


# ---------------------------------------------------------------------
# METER
# ---------------------------------------------------------------------


@override_settings(
    SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY,
    METER_API_BASE=METER_BASE,
)
@responses.activate
def test_meter_connect_returns_one_time_secret(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    responses.add(
        responses.GET,
        f"{METER_BASE}/devices/",
        json={"devices": [{"device_sn": "z6-1", "account_id": 99}]},
        status=200,
    )
    r = client.post(
        f"/api/spray/orgs/{org.id}/integrations/meter/connect",
        {"token": "T"},
        format="json",
    )
    assert r.status_code in (200, 201)
    body = r.json()
    assert "webhook_secret" in body
    assert "webhook_url" in body
    # Subsequent reads of /integrations should NOT include the secret.
    list_r = client.get(f"/api/spray/orgs/{org.id}/integrations")
    list_body = list_r.json()
    serialized = list_body["results"][0]
    assert "webhook_secret" not in serialized
    assert "token_ciphertext" not in serialized
