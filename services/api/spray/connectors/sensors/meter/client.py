"""METER ZENTRA Cloud HTTP client (M1.5 PR-E step 2).

Bearer-token auth: `Authorization: Token <token>`. v4 pinned via
`METER_API_BASE` setting (default `https://zentracloud.com/api/v4`).

Used for poll-as-gap-fill only; real-time data flows through the
webhook receiver (`webhook.py`). Endpoints:

- GET /devices/                       — device list for the account
- GET /readings/?device_sn=&start_date=&stop_date=
                                       — historic readings for one device
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
    return getattr(settings, "METER_API_BASE", "https://zentracloud.com/api/v4")


class MeterClient:
    """One client per IntegrationConnection.

    `creds` shape: `{token: "...", webhook_secret: "..."}`. Only `token`
    is used here; `webhook_secret` is consumed by `webhook.py`.
    """

    def __init__(self, creds: dict[str, Any]) -> None:
        token = creds.get("token", "")
        if not token:
            raise ConnectorAuthError("METER credentials missing token")
        self._token = token

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    def list_devices(self) -> list[dict[str, Any]]:
        data = self._get_json("/devices/")
        if isinstance(data, dict):
            return list(data.get("devices") or data.get("results") or [])
        if isinstance(data, list):
            return data
        return []

    def fetch_readings(
        self, device_sn: str, since: datetime, until: datetime | None = None
    ) -> dict[str, Any]:
        until = until or datetime.now(tz=dt_tz.utc)
        params = {
            "device_sn": device_sn,
            "start_date": _iso(since),
            "stop_date": _iso(until),
        }
        data = self._get_json("/readings/", params=params)
        if not isinstance(data, dict):
            raise ConnectorResponseError("METER /readings response was not a JSON object")
        return data

    def health(self) -> tuple[bool, str]:
        try:
            devices = self.list_devices()
            return True, f"{len(devices)} devices"
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
            "Authorization": f"Token {self._token}",
            "Accept": "application/json",
        }

    def _get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{_api_base()}{path}"
        try:
            resp = requests.get(
                url, headers=self._headers(), params=params, timeout=30
            )
        except requests.RequestException as exc:
            raise ConnectorResponseError(f"network error contacting METER: {exc}") from exc

        if resp.status_code in (401, 403):
            raise ConnectorAuthError(
                f"METER rejected request to {path} (status={resp.status_code})"
            )
        if resp.status_code == 429:
            raise ConnectorRateLimitError(f"METER rate-limited at {path}")
        if resp.status_code >= 500:
            raise ConnectorResponseError(
                f"METER returned {resp.status_code} at {path}"
            )

        try:
            return resp.json()
        except ValueError as exc:
            raise ConnectorResponseError(
                f"METER response at {path} was not JSON"
            ) from exc


def _iso(ts: datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt_tz.utc)
    return ts.astimezone(dt_tz.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
