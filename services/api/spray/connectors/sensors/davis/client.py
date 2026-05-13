"""Davis WeatherLink v2 HTTP client (M1.5 PR-E step 1).

Two-key auth: API-Key in `X-Api-Key` header, API-Secret in `X-Api-Secret`
header. Spec §12A.1 calls these out explicitly. No OAuth, no refresh.

Endpoints used:
- GET /v2/stations                                 — station list
- GET /v2/historic/{station_id}?...&start-timestamp=&end-timestamp=
                                                   — hourly historic data

Davis returns Unix timestamps in seconds; LW on a 0-15 scale; wind in mph.
The normalizer handles unit conversions; the client stays a thin wrapper.

Rate limit: 1,000 calls/hr account-wide (not per station). The polling
task throttles via cadence; we only catch the 429 here.
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


def _api_base() -> str:
    return getattr(settings, "DAVIS_API_BASE", "https://api.weatherlink.com/v2")


class DavisClient:
    """One client per IntegrationConnection.

    `creds` is the decrypted token blob: `{api_key: "...", api_secret: "..."}`.
    """

    def __init__(self, creds: dict[str, Any]) -> None:
        api_key = creds.get("api_key", "")
        api_secret = creds.get("api_secret", "")
        if not api_key or not api_secret:
            raise ConnectorAuthError("Davis credentials missing api_key or api_secret")
        self._api_key = api_key
        self._api_secret = api_secret

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    def list_stations(self) -> list[dict[str, Any]]:
        data = self._get_json("/stations")
        if isinstance(data, dict):
            return list(data.get("stations") or [])
        return []

    def fetch_historic(
        self, station_id: str, since: datetime, until: datetime | None = None
    ) -> dict[str, Any]:
        until = until or datetime.now(tz=dt_tz.utc)
        params = {
            "start-timestamp": int(since.replace(tzinfo=dt_tz.utc).timestamp())
            if since.tzinfo is None
            else int(since.astimezone(dt_tz.utc).timestamp()),
            "end-timestamp": int(until.astimezone(dt_tz.utc).timestamp()),
        }
        data = self._get_json(f"/historic/{station_id}", params=params)
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
            "X-Api-Key": self._api_key,
            "X-Api-Secret": self._api_secret,
            "Accept": "application/json",
        }

    def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{_api_base()}{path}"
        try:
            resp = requests.get(
                url, headers=self._headers(), params=params, timeout=30
            )
        except requests.RequestException as exc:
            raise ConnectorResponseError(f"network error contacting Davis: {exc}") from exc

        if resp.status_code in (401, 403):
            raise ConnectorAuthError(
                f"Davis rejected request to {path} (status={resp.status_code})"
            )
        if resp.status_code == 429:
            raise ConnectorRateLimitError(f"Davis rate-limited at {path}")
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
