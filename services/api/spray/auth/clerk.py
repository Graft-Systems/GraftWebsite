"""Clerk JWT authentication for DRF.

Validates an `Authorization: Bearer <token>` header against Clerk's JWKS,
resolves the local `spray.User` row by `clerk_user_id`, and returns
`(user, None)` for DRF to populate `request.user`.

JWKS is fetched lazily and cached in-process for an hour; cache invalidates
on `kid` mismatch (Clerk key rotation).

Spec section 17.2; M0-02 plan section 4.3.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import jwt
from django.conf import settings
from jwt.algorithms import RSAAlgorithm
from rest_framework import authentication, exceptions

from spray.models import User

logger = logging.getLogger(__name__)

_JWKS_CACHE: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600  # 1 hour
_HTTP_TIMEOUT_SECONDS = 5


def _resolve_jwks_url() -> str:
    """Pick the JWKS URL from Django settings.

    Either CLERK_JWKS_URL is set explicitly, or we derive it from
    CLERK_FRONTEND_API (e.g. `clerk.example.com` -> `https://clerk.example.com/.well-known/jwks.json`).
    """
    if getattr(settings, "CLERK_JWKS_URL", ""):
        return settings.CLERK_JWKS_URL
    frontend_api = getattr(settings, "CLERK_FRONTEND_API", "")
    if frontend_api:
        host = frontend_api.lstrip("https://").lstrip("http://").rstrip("/")
        return f"https://{host}/.well-known/jwks.json"
    raise RuntimeError(
        "Clerk JWKS URL not configured. Set CLERK_JWKS_URL or "
        "CLERK_FRONTEND_API in the environment."
    )


def _fetch_jwks(force: bool = False) -> list[dict[str, Any]]:
    """Return Clerk's JWKS keys, cached for one hour."""
    now = time.time()
    cached = _JWKS_CACHE.get("keys")
    fetched_at = _JWKS_CACHE.get("fetched_at", 0.0)
    if cached and not force and (now - fetched_at) < _JWKS_TTL_SECONDS:
        return cached  # type: ignore[return-value]

    url = _resolve_jwks_url()
    req = Request(url, headers={"User-Agent": "graft-spray/1.0"})
    try:
        with urlopen(req, timeout=_HTTP_TIMEOUT_SECONDS) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError) as e:
        raise exceptions.AuthenticationFailed(
            f"unable to fetch Clerk JWKS: {e}"
        ) from e

    keys = payload.get("keys", [])
    _JWKS_CACHE["keys"] = keys
    _JWKS_CACHE["fetched_at"] = now
    return keys


def _find_jwk(kid: str, *, allow_refresh: bool = True) -> dict[str, Any]:
    keys = _fetch_jwks()
    match = next((k for k in keys if k.get("kid") == kid), None)
    if match is None and allow_refresh:
        # Cold cache miss may be a key rotation. Refresh and try once.
        keys = _fetch_jwks(force=True)
        match = next((k for k in keys if k.get("kid") == kid), None)
    if match is None:
        raise exceptions.AuthenticationFailed(f"unknown Clerk key id: {kid}")
    return match


class ClerkJWTAuthentication(authentication.BaseAuthentication):
    """DRF authentication class validating Clerk JWTs.

    Returns `None` (passes through to next class) when no Authorization
    header is present, so unauthenticated routes still work. Raises
    `AuthenticationFailed` for malformed or invalid tokens.
    """

    keyword = "Bearer"

    def authenticate(
        self, request
    ) -> tuple[User, None] | None:  # type: ignore[override]
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return None
        if not auth_header.startswith(self.keyword + " "):
            return None  # let other auth classes try

        token = auth_header[len(self.keyword) + 1 :].strip()
        if not token:
            raise exceptions.AuthenticationFailed("empty bearer token")

        try:
            unverified_header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(
                f"malformed bearer token: {e}"
            ) from e

        kid = unverified_header.get("kid")
        if not kid:
            raise exceptions.AuthenticationFailed("token missing kid header")

        jwk = _find_jwk(kid)
        try:
            public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
        except (ValueError, TypeError) as e:
            raise exceptions.AuthenticationFailed(
                f"unable to load public key: {e}"
            ) from e

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                # Clerk does not always set `aud`; verify_aud=False is per
                # Clerk's recommended Python integration pattern.
                options={"verify_aud": False},
            )
        except jwt.ExpiredSignatureError as e:
            raise exceptions.AuthenticationFailed("token expired") from e
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f"invalid token: {e}") from e

        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise exceptions.AuthenticationFailed("token missing sub claim")

        try:
            user = User.objects.get(clerk_user_id=clerk_user_id)
        except User.DoesNotExist as e:
            # Webhook race: Clerk may have created the user, but our local
            # User row has not been synced yet. Fail closed; client retries.
            raise exceptions.AuthenticationFailed(
                "user not yet synced; please retry"
            ) from e

        if user.deleted_at is not None:
            raise exceptions.AuthenticationFailed("user account deleted")

        return (user, None)

    def authenticate_header(self, request) -> str:  # type: ignore[override]
        return self.keyword
