"""Shared fixtures for the Graft Spray test suite.

Builds a small RSA-keyed JWKS to mock Clerk's signing keys, plus helpers
for creating Users, Orgs, and Memberships in each role.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from jwt.algorithms import RSAAlgorithm
from rest_framework.test import APIClient

from spray.models import Membership, Org, User


# ---------------------------------------------------------------------
# Mock RSA / JWKS for Clerk JWT tests
# ---------------------------------------------------------------------


@pytest.fixture(scope="session")
def rsa_keypair():
    """Generate one RSA keypair per test session."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_key = private_key.public_key()
    jwk_str = RSAAlgorithm.to_jwk(public_key)
    jwk = json.loads(jwk_str)
    jwk["kid"] = "test-kid-1"
    jwk["alg"] = "RS256"
    jwk["use"] = "sig"
    return {
        "private_pem": private_pem,
        "jwk": jwk,
        "kid": "test-kid-1",
    }


@pytest.fixture
def mock_jwks(monkeypatch, rsa_keypair):
    """Patch the spray.auth.clerk JWKS cache with our test key."""
    from spray.auth import clerk as clerk_module

    clerk_module._JWKS_CACHE["keys"] = [rsa_keypair["jwk"]]
    clerk_module._JWKS_CACHE["fetched_at"] = time.time()

    # Block any real network refresh; force-refresh just re-serves our key.
    monkeypatch.setattr(
        clerk_module,
        "_fetch_jwks",
        lambda force=False: [rsa_keypair["jwk"]],
    )
    return rsa_keypair


def _make_token(rsa_keypair: dict[str, Any], *, sub: str, expires_in: int = 3600) -> str:
    now = int(time.time())
    payload = {
        "sub": sub,
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(
        payload,
        rsa_keypair["private_pem"],
        algorithm="RS256",
        headers={"kid": rsa_keypair["kid"]},
    )


@pytest.fixture
def make_token(rsa_keypair):
    def _factory(sub: str, expires_in: int = 3600) -> str:
        return _make_token(rsa_keypair, sub=sub, expires_in=expires_in)

    return _factory


# ---------------------------------------------------------------------
# Model fixtures
# ---------------------------------------------------------------------


@pytest.fixture
def make_user(db):
    counter = {"n": 0}

    def _factory(*, email: str | None = None, clerk_user_id: str | None = None) -> User:
        counter["n"] += 1
        n = counter["n"]
        return User.objects.create(
            clerk_user_id=clerk_user_id or f"user_{uuid.uuid4().hex[:12]}",
            email=email or f"u{n}@example.com",
            name=f"User {n}",
        )

    return _factory


@pytest.fixture
def make_org(db):
    def _factory(name: str = "Test Vineyard", region: str = "napa") -> Org:
        return Org.objects.create(name=name, region=region)

    return _factory


@pytest.fixture
def make_membership(db):
    def _factory(*, user: User, org: Org, role: str = Membership.Role.MEMBER) -> Membership:
        return Membership.objects.create(user=user, org=org, role=role)

    return _factory


# ---------------------------------------------------------------------
# DRF API client w/ Clerk auth
# ---------------------------------------------------------------------


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, mock_jwks, make_token, make_user):
    """Return (client, user) where client carries a valid Clerk JWT."""

    def _factory(user: User | None = None) -> tuple[APIClient, User]:
        if user is None:
            user = make_user()
        token = make_token(user.clerk_user_id)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return api_client, user

    return _factory
