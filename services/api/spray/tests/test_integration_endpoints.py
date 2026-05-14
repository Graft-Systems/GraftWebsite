"""Integration endpoint tests (M1.5 PR-D step 11).

Covers: list, OAuth start, OAuth callback (stubbed exchange), station list
(stubbed connector), link-block, disconnect, and cross-org isolation.
"""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

import pytest
import responses
from cryptography.fernet import Fernet
from django.contrib.gis.geos import Point, Polygon
from django.test import override_settings
from django.utils import timezone

from spray.connectors import credentials
from spray.connectors.base import VendorStation
from spray.models import (
    Block,
    IntegrationConnection,
    Membership,
    OAuthState,
    SensorStation,
    SensorStationBlock,
    Vineyard,
)


pytestmark = pytest.mark.django_db
TEST_KEY = Fernet.generate_key().decode()
PESSL_BASE = "https://api.fieldclimate.com/v2"

POLYGON = {
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


def _setup_admin(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    return client, user, org


def _make_block(org):
    v = Vineyard.objects.create(
        org=org, name="V", region=org.region, centroid=Point(-122.3, 38.3, srid=4326)
    )
    poly = Polygon(
        ((-122.3, 38.3), (-122.3, 38.31), (-122.29, 38.31), (-122.29, 38.3), (-122.3, 38.3)),
        srid=4326,
    )
    return Block.objects.create(vineyard=v, name="B", geom=poly, variety="cab")


def _make_conn(org):
    with override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY):
        ct = credentials.encrypt_token_blob(
            {"access_token": "AT", "refresh_token": "RT", "expires_in": 3600}
        )
    return IntegrationConnection.objects.create(
        org=org,
        vendor=IntegrationConnection.Vendor.PESSL,
        vendor_account_id="acct-1",
        token_ciphertext=ct,
    )


def test_list_returns_org_connections(auth_client, make_org, make_membership):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    _make_conn(org)
    r = client.get(f"/api/spray/orgs/{org.id}/integrations")
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) == 1
    assert body["results"][0]["vendor"] == "pessl"
    # Token never serialized.
    assert "token_ciphertext" not in body["results"][0]


@override_settings(
    PESSL_CLIENT_ID="cid",
    PESSL_CLIENT_SECRET="cs",
    PESSL_API_BASE=PESSL_BASE,
)
def test_oauth_start_creates_state_and_returns_url(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    r = client.post(f"/api/spray/orgs/{org.id}/integrations/pessl/oauth/start")
    assert r.status_code == 200
    body = r.json()
    assert body["authorize_url"].startswith(f"{PESSL_BASE}/oauth/authorize")
    assert OAuthState.objects.filter(org=org, vendor="pessl").count() == 1


@override_settings(
    PESSL_CLIENT_ID="cid",
    PESSL_CLIENT_SECRET="cs",
    PESSL_API_BASE=PESSL_BASE,
    SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY,
)
@responses.activate
def test_oauth_callback_creates_connection(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    state = OAuthState.objects.create(
        state="abc",
        org=org,
        vendor="pessl",
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={"access_token": "AT", "refresh_token": "RT", "expires_in": 3600},
    )
    responses.add(
        responses.GET,
        f"{PESSL_BASE}/user",
        json={"user_id": "pessl-uid"},
    )
    r = client.get(
        "/api/spray/integrations/pessl/oauth/callback?code=xyz&state=abc"
    )
    assert r.status_code in (200, 302)
    state.refresh_from_db()
    assert state.consumed_at is not None
    assert IntegrationConnection.objects.for_org(org).filter(
        vendor="pessl", vendor_account_id="pessl-uid"
    ).exists()


def test_oauth_callback_rejects_unknown_state(auth_client, make_user):
    client, _ = auth_client()
    r = client.get(
        "/api/spray/integrations/pessl/oauth/callback?code=x&state=ghost"
    )
    assert r.status_code == 400


def test_oauth_callback_rejects_expired_state(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    OAuthState.objects.create(
        state="ex",
        org=org,
        vendor="pessl",
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    r = client.get(
        "/api/spray/integrations/pessl/oauth/callback?code=x&state=ex"
    )
    assert r.status_code == 400


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_station_list_calls_connector_and_upserts(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)

    class _Stub:
        VENDOR_SLUG = "pessl"

        def list_stations(self, _connection):
            return [
                VendorStation(
                    vendor_station_id="STATION-A",
                    name="North",
                    lat=38.30,
                    lon=-122.31,
                )
            ]

    with patch("spray.connectors.registry.get_connector", return_value=_Stub()):
        r = client.get(f"/api/spray/orgs/{org.id}/integrations/{conn.id}/stations")

    assert r.status_code == 200
    assert SensorStation.objects.unscoped().filter(connection=conn).count() == 1


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_link_station_to_block(auth_client, make_org, make_membership):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="X", name="X"
    )
    block = _make_block(org)
    r = client.post(
        f"/api/spray/orgs/{org.id}/integrations/{conn.id}/stations/{station.id}/link-block",
        {"block_id": str(block.id)},
        format="json",
    )
    assert r.status_code == 201
    assert SensorStationBlock.objects.filter(station=station, block=block).exists()


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_disconnect_soft_deletes_connection(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    r = client.delete(f"/api/spray/orgs/{org.id}/integrations/{conn.id}")
    assert r.status_code == 200
    conn.refresh_from_db()
    assert conn.status == IntegrationConnection.Status.DISCONNECTED
    assert conn.disconnected_at is not None


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_cross_org_connection_returns_404(
    auth_client, make_org, make_membership, make_user
):
    # Org A has a connection; user from Org B tries to fetch it → 404.
    user_a = make_user()
    org_a = make_org(name="A")
    Membership.objects.create(user=user_a, org=org_a, role=Membership.Role.OWNER)
    conn = _make_conn(org_a)

    client_b, _, _org_b = _setup_admin(auth_client, make_org, make_membership)
    r = client_b.delete(f"/api/spray/orgs/{org_a.id}/integrations/{conn.id}")
    assert r.status_code in (403, 404)


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
@patch("spray.sensor_reading_pull.execute_pull_sensor_station")
def test_station_pull_readings_sync(
    mock_exec, auth_client, make_org, make_membership
):
    mock_exec.return_value = 2
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="X", name="X"
    )
    resp = client.post(
        f"/api/spray/orgs/{org.id}/integrations/{conn.id}/stations/"
        f"{station.id}/pull-readings",
        {"sync": True},
        format="json",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sync"] is True
    assert body["readings_upserted"] == 2


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_station_pull_readings_inactive_returns_400(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    conn.status = IntegrationConnection.Status.DISCONNECTED
    conn.save(update_fields=["status"])
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="X", name="X"
    )
    resp = client.post(
        f"/api/spray/orgs/{org.id}/integrations/{conn.id}/stations/"
        f"{station.id}/pull-readings",
        {"sync": True},
        format="json",
    )
    assert resp.status_code == 400
