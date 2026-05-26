"""METER ZENTRA Cloud HTTP client (M1.5 PR-E step 2).

Bearer-token auth: `Authorization: Token <token>`. v4 pinned via
`METER_API_BASE` setting (default `https://zentracloud.com/api/v4`).

Used for poll-as-gap-fill only; real-time data flows through the
webhook receiver (`webhook.py`). Documented v4 endpoints:

- GET /get_readings/?device_sn=&start_date=&end_date=  — readings (+ smoke test)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone as dt_tz
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


def _normalize_token(raw: str) -> str:
    """Strip whitespace; drop leading ``Token `` if the user pasted the full header value."""
    token = (raw or "").strip()
    if token.lower().startswith("token "):
        return token[6:].strip()
    return token


class MeterClient:
    """One client per IntegrationConnection.

    `creds` shape: `{token: "...", webhook_secret: "..."}`. Only `token`
    is used here; `webhook_secret` is consumed by `webhook.py`.
    """

    def __init__(self, creds: dict[str, Any]) -> None:
        token = _normalize_token(str(creds.get("token", "")))
        if not token:
            raise ConnectorAuthError("METER credentials missing token")
        self._token = token

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    def validate_token(self, device_sn: str) -> dict[str, Any]:
        """Smoke-test credentials against ``GET /get_readings/``.

        ZENTRA v4 has no device-list endpoint; validation requires a
        device serial the user copies from ZENTRA Cloud → Devices.
        """
        sn = (device_sn or "").strip()
        if not sn:
            raise ConnectorResponseError(
                "device_sn required to validate METER token (copy from ZENTRA Cloud → Devices)"
            )
        until = datetime.now(tz=dt_tz.utc)
        since = until - timedelta(hours=1)
        return self.fetch_readings(device_sn=sn, since=since, until=until)

    def fetch_readings(
        self, device_sn: str, since: datetime, until: datetime | None = None
    ) -> dict[str, Any]:
        until = until or datetime.now(tz=dt_tz.utc)
        params = {
            "device_sn": device_sn,
            "start_date": _iso(since),
            "end_date": _iso(until),
            "per_page": 1,
            "page_num": 1,
            "output_format": "json",
        }
        data = self._get_json("/get_readings/", params=params)
        if not isinstance(data, dict):
            raise ConnectorResponseError(
                "METER /get_readings response was not a JSON object"
            )
        return data

    def health(self) -> tuple[bool, str]:
        return True, "token configured (validate per device_sn)"

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
        if resp.status_code == 404:
            raise ConnectorResponseError(
                f"METER device not found or not accessible at {path} "
                f"(check device serial in ZENTRA Cloud → Devices)"
            )
        if resp.status_code == 429:
            raise ConnectorRateLimitError(f"METER rate-limited at {path}")
        if resp.status_code >= 500:
            raise ConnectorResponseError(
                f"METER returned {resp.status_code} at {path}"
            )
        if resp.status_code >= 400:
            raise ConnectorResponseError(
                f"METER returned {resp.status_code} at {path}"
            )

        try:
            return resp.json()
        except ValueError as exc:
            snippet = (resp.text or "")[:120].replace("\n", " ")
            raise ConnectorResponseError(
                f"METER response at {path} was not JSON"
                + (f" (starts with: {snippet!r})" if snippet else "")
            ) from exc


def _iso(ts: datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt_tz.utc)
    return ts.astimezone(dt_tz.utc).strftime("%Y-%m-%d %H:%M:%S")
