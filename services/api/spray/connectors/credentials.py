"""Fernet-based credential encryption (M1.5 PR-D step 2, spec §17.1, §20.4).

Wraps `cryptography.fernet.Fernet` with a single-key-from-env helper so
the rest of the codebase never sees plaintext token blobs. Plaintext
is only ever returned by `decrypt()` to the connector module that's
about to make an HTTP call; nothing else.

Hard rules
- The plaintext token NEVER appears in logs, Sentry, `__repr__`, or any
  serializer field. The model field is `BinaryField`; admin should not
  display it.
- Key rotation is out of scope for MVP. Re-encrypting under a new key
  is a follow-up task; for now `SPRAY_INTEGRATION_FERNET_KEY` is single
  and stable.
- Tests use a throwaway key supplied via `override_settings`. NEVER use
  the production key in tests.

Key generation:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class CredentialError(Exception):
    """Base for credential-encryption errors."""


class CredentialKeyMissing(CredentialError):
    """`SPRAY_INTEGRATION_FERNET_KEY` env var is unset or invalid."""


class CredentialDecryptError(CredentialError):
    """Ciphertext could not be decrypted with the configured key."""


def _fernet() -> Fernet:
    """Return a Fernet instance backed by the configured env-var key."""
    key = getattr(settings, "SPRAY_INTEGRATION_FERNET_KEY", "") or ""
    if not key:
        raise CredentialKeyMissing(
            "SPRAY_INTEGRATION_FERNET_KEY env var is not set"
        )
    if isinstance(key, str):
        key = key.encode()
    try:
        return Fernet(key)
    except (ValueError, TypeError) as exc:  # noqa: BLE001
        raise CredentialKeyMissing(
            "SPRAY_INTEGRATION_FERNET_KEY is not a valid Fernet key"
        ) from exc


def encrypt_token_blob(blob: dict[str, Any]) -> bytes:
    """Encrypt a token blob (dict) → ciphertext bytes for `BinaryField`."""
    if not isinstance(blob, dict):
        raise TypeError("token blob must be a dict")
    plaintext = json.dumps(blob, separators=(",", ":"), sort_keys=True).encode()
    return _fernet().encrypt(plaintext)


def decrypt_token_blob(ciphertext: bytes | memoryview) -> dict[str, Any]:
    """Decrypt ciphertext → token blob (dict). Raises on tamper / wrong key."""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    if not isinstance(ciphertext, bytes):
        raise TypeError("ciphertext must be bytes")
    try:
        plaintext = _fernet().decrypt(ciphertext)
    except InvalidToken as exc:
        raise CredentialDecryptError(
            "ciphertext could not be decrypted (wrong key, corrupted, or tampered)"
        ) from exc
    return json.loads(plaintext.decode())


def redact(blob: dict[str, Any]) -> dict[str, Any]:
    """Return a copy with token-like fields redacted, safe to log.

    Used by health/debug surfaces that need to display SOMETHING about a
    stored credential without leaking the secret. Token-like keys are
    identified by name match; everything else passes through.
    """
    redacted: dict[str, Any] = {}
    for k, v in blob.items():
        if any(needle in k.lower() for needle in ("token", "secret", "key", "password")):
            redacted[k] = "***redacted***"
        else:
            redacted[k] = v
    return redacted
