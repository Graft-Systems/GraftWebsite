"""Clerk JWT authentication tests (M0-02 step 10).

Mocks the JWKS cache with a known RSA key, mints tokens with PyJWT, and
runs them through ClerkJWTAuthentication directly.
"""

from __future__ import annotations

import time

import jwt
import pytest
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from spray.auth.clerk import ClerkJWTAuthentication


pytestmark = pytest.mark.django_db


def _request_with(token: str | None):
    factory = APIRequestFactory()
    headers = {}
    if token is not None:
        headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return factory.get("/", **headers)


def test_no_authorization_header_returns_none(mock_jwks):
    auth = ClerkJWTAuthentication()
    assert auth.authenticate(_request_with(None)) is None


def test_valid_token_resolves_user(mock_jwks, make_token, make_user):
    user = make_user(clerk_user_id="user_valid")
    token = make_token("user_valid")
    auth = ClerkJWTAuthentication()
    result = auth.authenticate(_request_with(token))
    assert result is not None
    resolved, _ = result
    assert resolved.id == user.id


def test_expired_token_rejected(mock_jwks, make_token, make_user):
    make_user(clerk_user_id="user_exp")
    token = make_token("user_exp", expires_in=-10)
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with(token))


def test_unknown_clerk_user_id_rejected(mock_jwks, make_token):
    token = make_token("user_does_not_exist")
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with(token))


def test_deleted_user_rejected(mock_jwks, make_token, make_user):
    from django.utils import timezone

    user = make_user(clerk_user_id="user_del")
    user.deleted_at = timezone.now()
    user.save()
    token = make_token("user_del")
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with(token))


def test_malformed_token_rejected(mock_jwks):
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with("not-a-jwt"))


def test_unknown_kid_rejected(mock_jwks, rsa_keypair):
    """Token signed with our key but bearing an unrecognised kid header."""
    payload = {"sub": "user_x", "iat": int(time.time()), "exp": int(time.time()) + 60}
    token = jwt.encode(
        payload,
        rsa_keypair["private_pem"],
        algorithm="RS256",
        headers={"kid": "totally-other-kid"},
    )
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with(token))


def test_token_missing_kid_rejected(mock_jwks, rsa_keypair):
    payload = {"sub": "user_y", "iat": int(time.time()), "exp": int(time.time()) + 60}
    token = jwt.encode(
        payload, rsa_keypair["private_pem"], algorithm="RS256"
    )
    auth = ClerkJWTAuthentication()
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(_request_with(token))
