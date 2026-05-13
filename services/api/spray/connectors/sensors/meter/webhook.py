"""METER ZENTRA HTTPS Push receiver helpers (M1.5 PR-E step 3).

The actual Django view lives in `spray.views.MeterWebhookView`. This
module hosts the pure logic so we can test HMAC validation + payload
parsing without DRF setup.

Per-connection HMAC secret (32-byte URL-safe random) issued at connect
time and surfaced once to the user in the integrations UI. Secret is
encrypted alongside the bearer token in `IntegrationConnection.token_ciphertext`.

METER's Push API conventions:
- Content-Type: application/x-www-form-urlencoded
- Field `data` = JSON body
- Header `X-MET-Signature: sha256=<hex>` (HMAC-SHA256 of raw body bytes)
- Optional retry on non-2xx response

We compute HMAC over the raw request body bytes (not the parsed `data`
field alone) to keep validation simple + tamper-evident.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from typing import Any


logger = logging.getLogger(__name__)


WEBHOOK_SECRET_BYTES = 32
SIGNATURE_HEADER = "X-MET-Signature"
SIGNATURE_PREFIX = "sha256="


def generate_webhook_secret() -> str:
    """Return a URL-safe random secret for a new METER connection."""
    return secrets.token_urlsafe(WEBHOOK_SECRET_BYTES)


def compute_signature(secret: str, body: bytes) -> str:
    """Compute the expected `X-MET-Signature` value for `body`."""
    if isinstance(secret, str):
        secret_bytes = secret.encode()
    else:
        secret_bytes = bytes(secret)
    digest = hmac.new(secret_bytes, body, hashlib.sha256).hexdigest()
    return f"{SIGNATURE_PREFIX}{digest}"


def verify_signature(secret: str, body: bytes, header_value: str) -> bool:
    """Constant-time HMAC compare. Returns False on any failure shape."""
    if not secret or not body or not header_value:
        return False
    expected = compute_signature(secret, body)
    try:
        return hmac.compare_digest(expected, header_value)
    except (TypeError, AttributeError):
        return False


# ---------------------------------------------------------------------
# Payload extraction
# ---------------------------------------------------------------------


def parse_meter_form_payload(form_data: dict[str, Any]) -> dict[str, Any]:
    """Extract the JSON push payload from METER's formdata POST.

    METER posts `data=<json-string>` (URL-encoded). DRF passes parsed
    form fields here; we deserialize the `data` field to a dict.

    Raises ValueError if `data` field is missing or not parseable.
    """
    import json

    if not isinstance(form_data, dict):
        raise ValueError("form_data must be a dict")
    raw = form_data.get("data")
    if raw is None:
        raise ValueError("METER push payload missing 'data' field")
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode()
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"METER 'data' field was not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("METER 'data' field did not decode to a JSON object")
    return parsed
