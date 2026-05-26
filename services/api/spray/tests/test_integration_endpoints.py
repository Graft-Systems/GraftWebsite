"""Integration endpoint tests (M1.5 PR-D step 11).

Covers: list, OAuth start, OAuth callback (stubbed exchange), station list
(stubbed connector), link-block, unlink-block (DELETE), disconnect, purge (hard-delete disconnected),
and cross-org isolation.
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


@override_settings(PESSL_CLIENT_ID="", PESSL_CLIENT_SECRET="")
def test_oauth_start_returns_503_when_pessl_not_configured(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    r = client.post(f"/api/spray/orgs/{org.id}/integrations/pessl/oauth/start")
    assert r.status_code == 503
    body = r.json()
    assert body["code"] == "pessl_not_configured"
    assert "PESSL_CLIENT_ID" in body["detail"]
    assert OAuthState.objects.filter(org=org, vendor="pessl").count() == 0


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
def test_unlink_station_from_block(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="X", name="X"
    )
    block = _make_block(org)
    SensorStationBlock.objects.create(station=station, block=block)
    r = client.delete(
        f"/api/spray/orgs/{org.id}/integrations/{conn.id}/stations/"
        f"{station.id}/link-block",
        {"block_id": str(block.id)},
        format="json",
    )
    assert r.status_code == 200
    assert not SensorStationBlock.objects.filter(
        station=station, block=block
    ).exists()


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_purge_disconnected_removes_connection_and_stations(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="X", name="X"
    )
    conn.status = IntegrationConnection.Status.DISCONNECTED
    conn.save(update_fields=["status"])
    r = client.delete(f"/api/spray/orgs/{org.id}/integrations/{conn.id}/purge")
    assert r.status_code == 200
    assert not IntegrationConnection.objects.unscoped().filter(id=conn.id).exists()
    assert not SensorStation.objects.unscoped().filter(id=station.id).exists()


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_purge_active_connection_returns_400(
    auth_client, make_org, make_membership
):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    conn = _make_conn(org)
    r = client.delete(f"/api/spray/orgs/{org.id}/integrations/{conn.id}/purge")
    assert r.status_code == 400
    assert IntegrationConnection.objects.unscoped().filter(id=conn.id).exists()


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
    mock_exec.return_value = {
        "count": 2,
        "readings": [
            {
                "ts": "2026-05-07T12:00:00Z",
                "air_temp_c": 18.5,
                "rh_pct": 80.0,
                "leaf_wetness_min": None,
                "precip_mm": None,
                "wind_speed_ms": None,
                "quality_flag": "ok",
            },
            {
                "ts": "2026-05-07T13:00:00Z",
                "air_temp_c": 18.5,
                "rh_pct": 80.0,
                "leaf_wetness_min": None,
                "precip_mm": None,
                "wind_speed_ms": None,
                "quality_flag": "ok",
            },
        ],
        "readings_total": 2,
        "readings_truncated": False,
        "gap_fill": False,
        "since_utc": "2026-05-06T00:00:00Z",
        "until_utc": "2026-05-07T14:00:00Z",
        "vendor": "pessl",
        "vendor_station_id": "X",
        "station_name": "X",
    }
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
    assert body["pull_summary"]["count"] == 2
    assert len(body["pull_summary"]["readings"]) == 2


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


# --- Weather Station Endpoints ---

def test_get_empty_weather_station(auth_client, make_org, make_membership):
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    r = client.get(f"/api/spray/orgs/{org.id}/weather-station")
    assert r.status_code == 200
    data = r.json()
    assert data["results"] == []
    assert "current" in data
    assert "feed" in data


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_get_weather_station_includes_live_current(
    auth_client, make_org, make_membership
):
    import responses as responses_lib

    from spray.models import WeatherStation

    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    WeatherStation.objects.create(
        org=org,
        provider="visual_crossing",
        station_id="vc-virtual-test",
        name="Napa County",
        location=Point(-122.3218, 38.4899),
        region=org.region,
    )
    responses_lib.add(
        responses_lib.GET,
        responses_lib.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json={
            "days": [
                {
                    "hours": [
                        {
                            "datetimeEpoch": 1714824000,
                            "temp": 22.0,
                            "humidity": 55,
                        }
                    ]
                }
            ]
        },
        status=200,
    )
    r = client.get(f"/api/spray/orgs/{org.id}/weather-station")
    assert r.status_code == 200
    data = r.json()
    assert data["current"]["available"] is True
    assert data["current"]["temp_c"] == 22.0
    assert data["current"]["temp_f"] == 71.6


def test_post_weather_station_admin(auth_client, make_org, make_membership):
    from spray.models import WeatherStation
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    payload = {
        "provider": "visual_crossing",
        "station_id": "test-station",
        "name": "My Vineyard",
        "location": {"type": "Point", "coordinates": [-122.3, 38.3]},
    }
    r = client.post(
        f"/api/spray/orgs/{org.id}/weather-station",
        payload,
        format="json",
    )
    assert r.status_code == 200
    assert r.json()["name"] == "My Vineyard"
    assert WeatherStation.objects.filter(org=org).count() == 1
    station = WeatherStation.objects.get(org=org)
    assert station.region == org.region
    assert station.location.x == -122.3
    assert station.location.y == 38.3


def test_post_weather_station_member_denied(auth_client, make_org, make_membership):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.MEMBER)
    payload = {
        "provider": "visual_crossing",
        "station_id": "test-station",
        "name": "My Vineyard",
        "location": {"type": "Point", "coordinates": [-122.3, 38.3]},
    }
    r = client.post(
        f"/api/spray/orgs/{org.id}/weather-station",
        payload,
        format="json",
    )
    assert r.status_code == 403


def test_update_existing_weather_station(auth_client, make_org, make_membership):
    from spray.models import WeatherStation
    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    WeatherStation.objects.create(
        org=org,
        provider="visual_crossing",
        station_id="old-id",
        name="Old Name",
        location=Point(-122.0, 38.0),
    )

    payload = {
        "provider": "visual_crossing",
        "station_id": "new-id",
        "name": "New Name",
        "location": {"type": "Point", "coordinates": [-122.5, 38.5]},
    }
    r = client.post(
        f"/api/spray/orgs/{org.id}/weather-station",
        payload,
        format="json",
    )
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"
    assert WeatherStation.objects.filter(org=org).count() == 1
    station = WeatherStation.objects.get(org=org)
    assert station.station_id == "new-id"
    assert station.location.x == -122.5


def test_update_weather_station_same_station_id(auth_client, make_org, make_membership):
    """Regression: re-saving location must not 400 on unique (provider, station_id)."""
    from spray.models import WeatherStation

    client, _, org = _setup_admin(auth_client, make_org, make_membership)
    station_id = f"vc-virtual-{org.id}"
    WeatherStation.objects.create(
        org=org,
        provider="visual_crossing",
        station_id=station_id,
        name="Napa County",
        location=Point(-122.3218, 38.4899),
    )
    payload = {
        "provider": "visual_crossing",
        "station_id": station_id,
        "name": "Napa County",
        "location": {"type": "Point", "coordinates": [-82.797325, 42.674968]},
    }
    r = client.post(
        f"/api/spray/orgs/{org.id}/weather-station",
        payload,
        format="json",
    )
    assert r.status_code == 200
    station = WeatherStation.objects.get(org=org)
    assert station.location.x == pytest.approx(-82.797325, rel=1e-5)
    assert station.location.y == pytest.approx(42.674968, rel=1e-5)
