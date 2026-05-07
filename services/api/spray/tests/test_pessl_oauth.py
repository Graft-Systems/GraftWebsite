"""Pessl OAuth module tests (M1.5 PR-D step 11)."""

from __future__ import annotations

import pytest
import responses
from django.test import override_settings

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)
from spray.connectors.sensors.pessl import oauth


PESSL_BASE = "https://api.fieldclimate.com/v2"


@override_settings(
    PESSL_CLIENT_ID="test-client",
    PESSL_CLIENT_SECRET="test-secret",
    PESSL_REDIRECT_URI="https://api.example.com/cb",
    PESSL_API_BASE=PESSL_BASE,
)
def test_build_authorize_url_includes_state_and_redirect():
    url = oauth.build_authorize_url(state="abc123")
    assert url.startswith(f"{PESSL_BASE}/oauth/authorize?")
    assert "client_id=test-client" in url
    assert "redirect_uri=https" in url
    assert "state=abc123" in url


@override_settings(
    PESSL_CLIENT_ID="test-client",
    PESSL_CLIENT_SECRET="test-secret",
    PESSL_REDIRECT_URI="https://api.example.com/cb",
    PESSL_API_BASE=PESSL_BASE,
)
@responses.activate
def test_exchange_code_happy_path():
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={
            "access_token": "AT",
            "refresh_token": "RT",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "stations.read data.read",
        },
        status=200,
    )
    responses.add(
        responses.GET,
        f"{PESSL_BASE}/user",
        json={"user_id": "pessl-uid-42", "email": "u@example.com"},
        status=200,
    )
    blob = oauth.exchange_code("auth-code")
    assert blob["access_token"] == "AT"
    assert blob["refresh_token"] == "RT"
    assert blob["expires_in"] == 3600
    assert blob["vendor_account_id"] == "pessl-uid-42"


@override_settings(
    PESSL_CLIENT_ID="test-client",
    PESSL_CLIENT_SECRET="test-secret",
    PESSL_API_BASE=PESSL_BASE,
)
@responses.activate
def test_exchange_code_400_raises_auth_error():
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={"error": "invalid_grant"},
        status=400,
    )
    with pytest.raises(ConnectorAuthError):
        oauth.exchange_code("bad-code")


@override_settings(
    PESSL_CLIENT_ID="test-client",
    PESSL_CLIENT_SECRET="test-secret",
    PESSL_API_BASE=PESSL_BASE,
)
@responses.activate
def test_exchange_code_429_raises_rate_limit():
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        status=429,
    )
    with pytest.raises(ConnectorRateLimitError):
        oauth.exchange_code("c")


@override_settings(
    PESSL_CLIENT_ID="test-client",
    PESSL_CLIENT_SECRET="test-secret",
    PESSL_API_BASE=PESSL_BASE,
)
@responses.activate
def test_refresh_returns_new_blob():
    responses.add(
        responses.POST,
        f"{PESSL_BASE}/oauth/token",
        json={
            "access_token": "AT2",
            "refresh_token": "RT2",
            "expires_in": 3600,
        },
        status=200,
    )
    blob = oauth.refresh_access_token("RT-old")
    assert blob["access_token"] == "AT2"
    assert blob["refresh_token"] == "RT2"


@override_settings(PESSL_CLIENT_ID="", PESSL_CLIENT_SECRET="")
def test_missing_client_id_raises_at_call_site():
    # No HTTP mock needed — we should bail before touching the wire.
    with pytest.raises(ConnectorAuthError):
        oauth.exchange_code("c")
