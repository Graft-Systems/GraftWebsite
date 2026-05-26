"""Pessl FieldClimate OAuth 2.0 partner-app flow (M1.5 PR-D step 4).

Three operations:

1. `build_authorize_url(state)` — assemble the redirect URL the frontend
   sends the user to. State is HMAC-signed elsewhere; this module just
   embeds it.
2. `exchange_code(code)` — swap the callback `code` for an access_token
   + refresh_token + expires_in. Persisted by the callback view.
3. `refresh_access_token(refresh_token)` — used by the connector when an
   API call returns 401. Returns the new token blob; if Pessl rejects
   the refresh itself, raises `ConnectorAuthError` so the caller can
   mark the connection `needs_reauth`.

Pessl docs are loaded from a SmartBear/Swagger-hosted spec; the partner
app credentials (client_id + client_secret) come from a manual partner
review (see PR-D plan §3 pre-flight). Until those land, tests mock all
HTTP via `responses`.
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)


logger = logging.getLogger(__name__)


def pessl_oauth_configured() -> bool:
    """True when partner-app client credentials are present."""
    cid = getattr(settings, "PESSL_CLIENT_ID", "") or ""
    cs = getattr(settings, "PESSL_CLIENT_SECRET", "") or ""
    return bool(cid.strip() and cs.strip())


def pessl_oauth_config_error() -> str | None:
    """Human-readable hint when OAuth cannot start; None when configured."""
    missing: list[str] = []
    if not (getattr(settings, "PESSL_CLIENT_ID", "") or "").strip():
        missing.append("PESSL_CLIENT_ID")
    if not (getattr(settings, "PESSL_CLIENT_SECRET", "") or "").strip():
        missing.append("PESSL_CLIENT_SECRET")
    if not missing:
        return None
    return (
        f"Pessl OAuth is not configured ({', '.join(missing)} unset). "
        "Register a FieldClimate partner app and set these in services/api/.env "
        "(see services/api/.env.example). Restart the API after updating."
    )


def _api_base() -> str:
    return getattr(settings, "PESSL_API_BASE", "https://api.fieldclimate.com/v2")


def _client_id() -> str:
    cid = getattr(settings, "PESSL_CLIENT_ID", "") or ""
    if not cid:
        raise ConnectorAuthError("PESSL_CLIENT_ID env var is not set")
    return cid


def _client_secret() -> str:
    cs = getattr(settings, "PESSL_CLIENT_SECRET", "") or ""
    if not cs:
        raise ConnectorAuthError("PESSL_CLIENT_SECRET env var is not set")
    return cs


def _redirect_uri() -> str:
    return getattr(
        settings,
        "PESSL_REDIRECT_URI",
        "https://api.graft-systems.app/api/spray/integrations/pessl/oauth/callback",
    )


# ---------------------------------------------------------------------
# 1. Authorize URL
# ---------------------------------------------------------------------


def build_authorize_url(state: str, scopes: list[str] | None = None) -> str:
    """Assemble the partner-app authorize URL the user should be sent to.

    Pessl OAuth 2.0 follows the standard authorization-code flow. The
    `state` is opaque to Pessl and is round-tripped to the callback.
    Default scopes cover read access to stations + data; we don't ask
    for write scopes (PR-D never writes back to FieldClimate).
    """
    params = {
        "client_id": _client_id(),
        "response_type": "code",
        "redirect_uri": _redirect_uri(),
        "state": state,
        "scope": " ".join(scopes or ["stations.read", "data.read"]),
    }
    return f"{_api_base()}/oauth/authorize?{urlencode(params)}"


# ---------------------------------------------------------------------
# 2. Code exchange
# ---------------------------------------------------------------------


def exchange_code(code: str) -> dict[str, Any]:
    """Swap an OAuth `code` for tokens. Returns a token blob:
        {
          "access_token": "…",
          "refresh_token": "…",
          "token_type": "Bearer",
          "expires_in": 3600,           # seconds
          "scope": "stations.read data.read",
          "vendor_account_id": "…"      # extracted from /v2/user
        }

    Raises:
        ConnectorAuthError: code rejected (400/401), or client creds wrong.
        ConnectorRateLimitError: 429.
        ConnectorResponseError: 5xx or malformed payload.
    """
    url = f"{_api_base()}/oauth/token"
    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": _redirect_uri(),
        "client_id": _client_id(),
        "client_secret": _client_secret(),
    }
    resp = _post_token(url, body)
    blob = _parse_token_response(resp)
    blob["vendor_account_id"] = _fetch_account_id(blob["access_token"])
    return blob


# ---------------------------------------------------------------------
# 3. Refresh
# ---------------------------------------------------------------------


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Swap a refresh_token for a new access_token (+ rotated refresh).

    Pessl rotates the refresh token on use; the new value MUST be persisted
    or the connection breaks on the next refresh. The caller writes the
    returned blob back through `credentials.encrypt_token_blob` in a single
    `transaction.atomic()`.
    """
    url = f"{_api_base()}/oauth/token"
    body = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": _client_id(),
        "client_secret": _client_secret(),
    }
    resp = _post_token(url, body)
    return _parse_token_response(resp)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _post_token(url: str, body: dict[str, str]) -> requests.Response:
    try:
        resp = requests.post(url, data=body, timeout=15)
    except requests.RequestException as exc:
        raise ConnectorResponseError(f"network error contacting Pessl: {exc}") from exc

    if resp.status_code == 429:
        raise ConnectorRateLimitError("Pessl OAuth: rate-limited (429)")
    if resp.status_code in (400, 401, 403):
        # Don't log the body — could contain a code or refresh token.
        raise ConnectorAuthError(
            f"Pessl OAuth rejected the request (status={resp.status_code})"
        )
    if resp.status_code >= 500:
        raise ConnectorResponseError(
            f"Pessl OAuth returned {resp.status_code}"
        )
    return resp


def _parse_token_response(resp: requests.Response) -> dict[str, Any]:
    try:
        data = resp.json()
    except ValueError as exc:
        raise ConnectorResponseError("Pessl OAuth response was not JSON") from exc

    required = ("access_token", "refresh_token", "expires_in")
    missing = [f for f in required if f not in data]
    if missing:
        raise ConnectorResponseError(
            f"Pessl OAuth response missing fields: {missing}"
        )

    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "token_type": data.get("token_type", "Bearer"),
        "expires_in": int(data["expires_in"]),
        "scope": data.get("scope", ""),
    }


def _fetch_account_id(access_token: str) -> str:
    """Probe `/v2/user` so we have a stable vendor_account_id at connect time."""
    url = f"{_api_base()}/user"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        resp = requests.get(url, headers=headers, timeout=15)
    except requests.RequestException as exc:
        raise ConnectorResponseError(f"network error fetching Pessl user: {exc}") from exc
    if resp.status_code in (401, 403):
        raise ConnectorAuthError("Pessl /user rejected the access token")
    if resp.status_code >= 500:
        raise ConnectorResponseError(f"Pessl /user returned {resp.status_code}")
    try:
        data = resp.json()
    except ValueError as exc:
        raise ConnectorResponseError("Pessl /user response was not JSON") from exc

    # Pessl's user payload exposes the user's UID under different keys
    # across plans; pick the first one that's present and stable.
    for key in ("user_id", "id", "username"):
        if data.get(key):
            return str(data[key])
    raise ConnectorResponseError("Pessl /user response had no usable account ID")
