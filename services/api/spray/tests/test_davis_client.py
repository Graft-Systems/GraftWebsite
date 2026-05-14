"""Davis client tests (M1.5 PR-E step 8)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

import pytest
import responses
from django.test import override_settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)
from spray.connectors.sensors.davis.client import (
    DAVIS_DEMO_STATION_UUID,
    DavisClient,
    is_davis_public_demo_station_id,
)


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


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_400_raises_connector_response_error():
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"code": 400, "message": "bad window"},
        status=400,
    )
    client = DavisClient(creds=_creds())
    with pytest.raises(ConnectorResponseError) as ei:
        client.list_stations()
    assert "400" in str(ei.value)


def test_missing_creds_raises():
    with pytest.raises(ConnectorAuthError):
        DavisClient(creds={"api_key": "", "api_secret": ""})


def test_is_davis_public_demo_station_id():
    assert is_davis_public_demo_station_id(None) is False
    assert is_davis_public_demo_station_id(DAVIS_DEMO_STATION_UUID) is True
    assert is_davis_public_demo_station_id(" 2 ") is True
    assert is_davis_public_demo_station_id("other") is False


@override_settings(DAVIS_API_BASE=DAVIS_BASE, DAVIS_DEMO_MODE=True)
@responses.activate
def test_demo_mode_adds_demo_query_param():
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"stations": []},
        status=200,
    )
    client = DavisClient(creds=_creds())
    out = client.list_stations()
    req_url = responses.calls[0].request.url
    assert "demo=true" in req_url
    assert "api-key=K" in req_url
    assert len(out) == 1
    assert out[0]["station_id_uuid"] == DAVIS_DEMO_STATION_UUID


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_demo_mode_explicit_without_settings():
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"stations": []},
        status=200,
    )
    client = DavisClient(creds=_creds(), demo_mode=True)
    client.list_stations()
    req_url = responses.calls[0].request.url
    assert "demo=true" in req_url
    assert "api-key=K" in req_url


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_demo_mode_false_omits_demo_param():
    responses.add(
        responses.GET,
        f"{DAVIS_BASE}/stations",
        json={"stations": [{"station_id": 1, "station_name": "X"}]},
        status=200,
    )
    client = DavisClient(creds=_creds(), demo_mode=False)
    client.list_stations()
    req_url = responses.calls[0].request.url
    assert "demo=true" not in req_url
    assert "api-key=K" in req_url


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


@override_settings(DAVIS_API_BASE=DAVIS_BASE)
@responses.activate
def test_fetch_historic_station_id_2_uses_demo_uuid_path():
    responses.add(
        responses.GET,
        responses.matchers.re.compile(
            rf"{re.escape(DAVIS_BASE)}/historic/{re.escape(DAVIS_DEMO_STATION_UUID)}\?.*"
        ),
        json={"sensors": []},
        status=200,
    )
    client = DavisClient(creds=_creds())
    client.fetch_historic(
        station_id="2",
        since=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    path = responses.calls[0].request.url.split("?", 1)[0]
    assert path.endswith(f"/historic/{DAVIS_DEMO_STATION_UUID}")
