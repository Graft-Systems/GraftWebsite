"""Pessl client + auto-refresh tests (M1.5 PR-D step 11)."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
import responses
from django.test import override_settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
)
from spray.connectors.sensors.pessl.client import PesslClient


PESSL_BASE = "https://api.fieldclimate.com/v2"


def _blob():
    return {
        "access_token": "AT",
        "refresh_token": "RT",
        "expires_in": 3600,
        "token_type": "Bearer",
    }


@override_settings(
    PESSL_API_BASE=PESSL_BASE,
    PESSL_CLIENT_ID="cid",
    PESSL_CLIENT_SECRET="cs",
)
@responses.activate
def test_list_stations_happy_path():
    responses.add(
        responses.GET,
        f"{PESSL_BASE}/user/stations",
        json=[
            {
                "name": "STATION-A",
                "info": {"custom_name": "North Block"},
                "position": {"geo": {"lat": 38.30, "lon": -122.31}},
            }
        ],
        status=200,
    )
    client = PesslClient(token_blob=_blob())
    stations = client.list_stations()
    assert isinstance(stations, list) and stations[0]["name"] == "STATION-A"


@override_settings(PESSL_API_BASE=PESSL_BASE, PESSL_CLIENT_ID="cid", PESSL_CLIENT_SECRET="cs")
@responses.activate
def test_401_triggers_refresh_then_retries():
    # 1st GET fails 401 → refresh succeeds → 2nd GET succeeds.
    responses.add(
        responses.GET, f"{PESSL_BASE}/user/stations", status=401
    )
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={"access_token": "AT2", "refresh_token": "RT2", "expires_in": 3600},
        status=200,
    )
    responses.add(
        responses.GET, f"{PESSL_BASE}/user/stations", json=[], status=200
    )
    persisted: list[dict] = []
    client = PesslClient(
        token_blob=_blob(),
        on_token_refresh=lambda b: persisted.append(b),
    )
    out = client.list_stations()
    assert out == []
    assert persisted and persisted[-1]["access_token"] == "AT2"


@override_settings(PESSL_API_BASE=PESSL_BASE, PESSL_CLIENT_ID="cid", PESSL_CLIENT_SECRET="cs")
@responses.activate
def test_double_401_raises_auth_error():
    responses.add(
        responses.GET, f"{PESSL_BASE}/user/stations", status=401
    )
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={"access_token": "AT2", "refresh_token": "RT2", "expires_in": 3600},
        status=200,
    )
    responses.add(
        responses.GET, f"{PESSL_BASE}/user/stations", status=401
    )
    client = PesslClient(token_blob=_blob())
    with pytest.raises(ConnectorAuthError):
        client.list_stations()


@override_settings(PESSL_API_BASE=PESSL_BASE)
@responses.activate
def test_429_raises_rate_limit():
    responses.add(
        responses.GET, f"{PESSL_BASE}/user/stations", status=429
    )
    client = PesslClient(token_blob=_blob())
    with pytest.raises(ConnectorRateLimitError):
        client.list_stations()


@override_settings(PESSL_API_BASE=PESSL_BASE)
@responses.activate
def test_fetch_raw_data_returns_payload():
    responses.add(
        responses.GET,
        responses.matchers.re.compile(rf"{PESSL_BASE}/data/STATION-A/raw/.*"),
        json={"name": {"original_name": "x"}, "dates": [], "data": {}},
        status=200,
    )
    client = PesslClient(token_blob=_blob())
    payload = client.fetch_raw_data(
        vendor_station_id="STATION-A",
        since=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    assert "dates" in payload
