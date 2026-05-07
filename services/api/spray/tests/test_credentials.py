"""Fernet credential helper tests (M1.5 PR-D step 11)."""

from __future__ import annotations

import pytest
from cryptography.fernet import Fernet
from django.test import override_settings

from spray.connectors import credentials


TEST_KEY = Fernet.generate_key().decode()


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_encrypt_decrypt_round_trip():
    blob = {"access_token": "secret123", "refresh_token": "r456", "expires_in": 3600}
    ct = credentials.encrypt_token_blob(blob)
    assert isinstance(ct, bytes)
    assert b"secret123" not in ct  # ciphertext does not leak plaintext
    assert credentials.decrypt_token_blob(ct) == blob


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_decrypt_handles_memoryview():
    """Postgres BinaryField returns memoryview; decrypt must accept it."""
    blob = {"access_token": "x"}
    ct = credentials.encrypt_token_blob(blob)
    assert credentials.decrypt_token_blob(memoryview(ct)) == blob


@override_settings(SPRAY_INTEGRATION_FERNET_KEY="")
def test_missing_key_raises():
    with pytest.raises(credentials.CredentialKeyMissing):
        credentials.encrypt_token_blob({"a": 1})


@override_settings(SPRAY_INTEGRATION_FERNET_KEY="not-a-real-fernet-key")
def test_invalid_key_raises():
    with pytest.raises(credentials.CredentialKeyMissing):
        credentials.encrypt_token_blob({"a": 1})


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_wrong_key_decrypt_raises():
    blob = {"access_token": "x"}
    ct = credentials.encrypt_token_blob(blob)
    other_key = Fernet.generate_key().decode()
    with override_settings(SPRAY_INTEGRATION_FERNET_KEY=other_key):
        with pytest.raises(credentials.CredentialDecryptError):
            credentials.decrypt_token_blob(ct)


def test_redact_drops_secret_keys():
    blob = {"access_token": "secret", "refresh_token": "x", "expires_in": 60, "scope": "a"}
    out = credentials.redact(blob)
    assert out["access_token"] == "***redacted***"
    assert out["refresh_token"] == "***redacted***"
    assert out["expires_in"] == 60
    assert out["scope"] == "a"
