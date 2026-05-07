"""Pessl FieldClimate HTTP client (M1.5 PR-D step 5).

Thin requests-based wrapper. Auto-refreshes the access_token on 401 by
calling `oauth.refresh_access_token` and persisting the rotated blob via
the connection callback. After one successful refresh + retry, a second
401 is treated as `ConnectorAuthError` (refresh-token itself dead).

Endpoints used:
- GET /user/stations            — station list for the authenticated account
- GET /data/{station}/raw/from/{from}/to/{to}  — raw time-series readings

All non-token data flows through here. Token blobs come from
`spray.connectors.credentials.decrypt_token_blob`; the plaintext access
token never leaves this module's stack frame.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_tz
from typing import Any, Callable

import requests
from django.conf import settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)
from spray.connectors.sensors.pessl import oauth


logger = logging.getLogger(__name__)


def _api_base() -> str:
    return getattr(settings, "PESSL_API_BASE", "https://api.fieldclimate.com/v2")


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


class PesslClient:
    """One client per (connection, request-path).

    `token_blob` is the decrypted token dict. `on_token_refresh` is a
    callback that the client invokes when it rotates the access_token
    via refresh; the connection module persists the new ciphertext.

    If `on_token_refresh` is None, refresh still happens but the new
    blob is held in memory only — useful for tests.
    """

    def __init__(
        self,
        token_blob: dict[str, Any],
        on_token_refresh: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self._token = dict(token_blob)
        self._on_refresh = on_token_refresh
        self._refreshed_once = False

    def list_stations(self) -> list[dict[str, Any]]:
        return self._get_json("/user/stations")

    def fetch_raw_data(
        self, vendor_station_id: str, since: datetime, until: datetime | None = None
    ) -> dict[str, Any]:
        """Hourly raw data for one station.

        Pessl path expects UTC timestamps in `YYYY-MM-DD HH:MM:SS` form
        URL-encoded. We pass a `from`/`to` pair; `to` defaults to "now".
        """
        until = until or datetime.now(tz=dt_tz.utc)
        since_str = _fmt_pessl_ts(since)
        until_str = _fmt_pessl_ts(until)
        path = f"/data/{vendor_station_id}/raw/from/{since_str}/to/{until_str}"
        result = self._get_json(path)
        if not isinstance(result, dict):
            raise ConnectorResponseError("Pessl /data response was not a JSON object")
        return result

    def health(self) -> tuple[bool, str]:
        try:
            data = self._get_json("/user")
            if isinstance(data, dict):
                return True, "ok"
            return False, "user payload was not an object"
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
        token = self._token.get("access_token", "")
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def _get_json(self, path: str) -> Any:
        url = f"{_api_base()}{path}"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=30)
        except requests.RequestException as exc:
            raise ConnectorResponseError(f"network error contacting Pessl: {exc}") from exc

        if resp.status_code == 401 and not self._refreshed_once:
            self._refresh_in_place()
            try:
                resp = requests.get(url, headers=self._headers(), timeout=30)
            except requests.RequestException as exc:
                raise ConnectorResponseError(
                    f"network error contacting Pessl after refresh: {exc}"
                ) from exc

        if resp.status_code in (401, 403):
            raise ConnectorAuthError(
                f"Pessl rejected request to {path} (status={resp.status_code})"
            )
        if resp.status_code == 429:
            raise ConnectorRateLimitError(f"Pessl rate-limited at {path}")
        if resp.status_code >= 500:
            raise ConnectorResponseError(
                f"Pessl returned {resp.status_code} at {path}"
            )

        try:
            return resp.json()
        except ValueError as exc:
            raise ConnectorResponseError(
                f"Pessl response at {path} was not JSON"
            ) from exc

    def _refresh_in_place(self) -> None:
        refresh_token = self._token.get("refresh_token")
        if not refresh_token:
            raise ConnectorAuthError("no refresh_token in token blob")
        new_blob = oauth.refresh_access_token(refresh_token)
        self._token.update(new_blob)
        self._refreshed_once = True
        if self._on_refresh is not None:
            try:
                self._on_refresh(self._token)
            except Exception:  # noqa: BLE001
                logger.exception("on_token_refresh callback raised; token may not have been persisted")


def _fmt_pessl_ts(ts: datetime) -> str:
    """Pessl URL path needs `YYYY-MM-DD HH:MM:SS` URL-encoded → `%20`."""
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt_tz.utc)
    ts_utc = ts.astimezone(dt_tz.utc)
    # Pessl accepts both space-separated and `T`-separated; we use `T` to
    # avoid URL-encoding subtleties on path segments.
    return ts_utc.strftime("%Y-%m-%dT%H:%M:%S")
