"""Davis client tests (M1.5 PR-E step 8)."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
import responses
from django.test import override_settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
)
from spray.connectors.sensors.davis.client import DavisClient


DAVIS_BASE = "https://api.weatherlink.com/v2"


def _creds():
    return {"api_key": "K", "api_secret": "S"}


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_list_stations_happy_path():
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"stations": [{"station_id": 123, "station_name": "Estate"}]},
        status=200,
    )
    client = DavisClient(creds=_creds())
    stations = client.list_stations()
    assert stations[0]["station_id"] == 123


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_401_raises_auth_error():
    responses.add(
        responses.GET, f"{DAVIS_BASE}/stations", status=401
    )
    client = DavisClient(creds=_creds())
    with pytest.raises(ConnectorAuthError):
        client.list_stations()


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_429_raises_rate_limit():
    responses.add(
        responses.GET, f"{DAVIS_BASE}/stations", status=429
    )
    client = DavisClient(creds=_creds())
    with pytest.raises(ConnectorRateLimitError):
        client.list_stations()


def test_missing_creds_raises():
    with pytest.raises(ConnectorAuthError):
        DavisClient(creds={"api_key": "", "api_secret": ""})


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_fetch_historic_passes_timestamps():
    responses.add(
        responses.GET,
        responses.matchers.re.compile(rf"{DAVIS_BASE}/historic/123\?.*"),
        json={"sensors": []},
        status=200,
    )
    client = DavisClient(creds=_creds())
    payload = client.fetch_historic(
        station_id="123",
        since=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    assert "sensors" in payload
