"""Davis WeatherLink v2 HTTP client (M1.5 PR-E step 1).

Auth (WeatherLink v2 spec): API Key as query param ``api-key`` on every
request; API Secret in ``X-Api-Secret`` header (never in the query string).
No OAuth, no refresh.

Endpoints used:
- GET /v2/stations                                 — station list
- GET /v2/historic/{station_id}?...&start-timestamp=&end-timestamp=
                                                   — hourly historic data

Davis returns Unix timestamps in seconds; LW on a 0-15 scale; wind in mph.
The normalizer handles unit conversions; the client stays a thin wrapper.

Rate limit: 1,000 calls/hr account-wide (not per station). The polling
task throttles via cadence; we only catch the 429 here.

Demo mode (``DAVIS_DEMO_MODE`` or ``demo_mode=True``): append ``demo=true``
to every query string so WeatherLink authorizes access to the public demo
station without owning it. If ``/stations`` returns no rows while demo mode
is on, we synthesize the documented demo station UUID so UIs can list it.
See: https://weatherlink.github.io/v2-api/authentication and demo UUID + ``demo`` param.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_tz
from typing import Any

import requests
from django.conf import settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)


logger = logging.getLogger(__name__)

# Davis public demo hardware (Vantage Pro2 Plus + EnviroMonitor + AirLink).
# WeatherLink docs also reference integer station id 2; API paths use the UUID.
DAVIS_DEMO_STATION_UUID = "9722cfc3-a4ef-47b9-befb-72f52592d6ed"

def is_davis_public_demo_station_id(station_id: str | None) -> bool:
    if station_id is None:
        return False
    s = str(station_id).strip().lower()
    return s in (DAVIS_DEMO_STATION_UUID.lower(), "2")


_DEMO_STATION_FALLBACK: dict[str, Any] = {
    "station_id_uuid": DAVIS_DEMO_STATION_UUID,
    "station_name": "Davis public demo (Vantage Pro2 Plus + EnviroMonitor + AirLink)",
    "latitude": None,
    "longitude": None,
}


def _api_base() -> str:
    return getattr(settings, "DAVIS_API_BASE", "https://api.weatherlink.com/v2")


def _settings_demo_mode() -> bool:
    return bool(getattr(settings, "DAVIS_DEMO_MODE", False))


class DavisClient:
    """One client per IntegrationConnection.

    `creds` is the decrypted token blob: `{api_key: "...", api_secret: "..."}`.
    When ``demo_mode`` is True (or settings ``DAVIS_DEMO_MODE``), all GETs
    also include ``demo=true`` so Davis's shared demo stream is authorized.
    """

    def __init__(
        self,
        creds: dict[str, Any],
        *,
        demo_mode: bool | None = None,
    ) -> None:
        api_key = creds.get("api_key", "")
        api_secret = creds.get("api_secret", "")
        if not api_key or not api_secret:
            raise ConnectorAuthError("Davis credentials missing api_key or api_secret")
        self._api_key = api_key
        self._api_secret = api_secret
        self._demo_mode = _settings_demo_mode() if demo_mode is None else bool(demo_mode)

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    def list_stations(self) -> list[dict[str, Any]]:
        data = self._get_json("/stations")
        if isinstance(data, dict):
            stations = list(data.get("stations") or [])
        else:
            stations = []
        if self._demo_mode and not stations:
            return [dict(_DEMO_STATION_FALLBACK)]
        return stations

    def fetch_historic(
        self, station_id: str, since: datetime, until: datetime | None = None
    ) -> dict[str, Any]:
        until = until or datetime.now(tz=dt_tz.utc)
        # Docs use UUID in /historic/{id}; integer demo id 2 is the same station.
        sid = (
            DAVIS_DEMO_STATION_UUID
            if str(station_id).strip() == "2"
            else str(station_id).strip()
        )
        params = {
            "start-timestamp": int(since.replace(tzinfo=dt_tz.utc).timestamp())
            if since.tzinfo is None
            else int(since.astimezone(dt_tz.utc).timestamp()),
            "end-timestamp": int(until.astimezone(dt_tz.utc).timestamp()),
        }
        data = self._get_json(f"/historic/{sid}", params=params)
        if not isinstance(data, dict):
            raise ConnectorResponseError("Davis /historic response was not a JSON object")
        return data

    def health(self) -> tuple[bool, str]:
        try:
            data = self.list_stations()
            return True, f"{len(data)} stations"
        except ConnectorAuthError as exc:
            return False, f"auth: {exc}"
        except ConnectorRateLimitError as exc:
            return False, f"rate-limited: {exc}"
        except ConnectorResponseError as exc:
            return False, f"response: {exc}"
        except Exception as exc:  # noqa: BLE001
            return False, f"unexpected: {exc}"

    # -----------------------------------------------------------------
    # Internals
    # -----------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "X-Api-Secret": self._api_secret,
            "Accept": "application/json",
        }

    def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{_api_base()}{path}"
        merged: dict[str, Any] = dict(params or {})
        merged["api-key"] = self._api_key
        if self._demo_mode:
            merged["demo"] = "true"
        try:
            resp = requests.get(
                url, headers=self._headers(), params=merged, timeout=30
            )
        except requests.RequestException as exc:
            raise ConnectorResponseError(f"network error contacting Davis: {exc}") from exc

        if resp.status_code in (401, 403):
            raise ConnectorAuthError(
                f"Davis rejected request to {path} (status={resp.status_code})"
            )
        if resp.status_code == 429:
            raise ConnectorRateLimitError(f"Davis rate-limited at {path}")
        if 400 <= resp.status_code < 500:
            raise ConnectorResponseError(
                f"Davis returned {resp.status_code} at {path}: {resp.text[:400]}"
            )
        if resp.status_code >= 500:
            raise ConnectorResponseError(
                f"Davis returned {resp.status_code} at {path}"
            )

        try:
            return resp.json()
        except ValueError as exc:
            raise ConnectorResponseError(
                f"Davis response at {path} was not JSON"
            ) from exc
