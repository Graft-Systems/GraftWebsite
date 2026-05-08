"""METER webhook helpers unit tests — pure logic, no DB (M1.5 PR-E step 8)."""

from __future__ import annotations

import pytest

from spray.connectors.sensors.meter.webhook import (
    SIGNATURE_PREFIX,
    compute_signature,
    generate_webhook_secret,
    parse_meter_form_payload,
    verify_signature,
)


def test_generate_webhook_secret_is_unique_and_url_safe():
    a = generate_webhook_secret()
    b = generate_webhook_secret()
    assert a != b
    assert "+" not in a and "/" not in a  # url-safe characters only
    assert len(a) >= 32


def test_compute_and_verify_signature_round_trip():
    secret = "supersecret"
    body = b'{"device":{"device_sn":"z6-99"},"readings":[]}'
    sig = compute_signature(secret, body)
    assert sig.startswith(SIGNATURE_PREFIX)
    assert verify_signature(secret, body, sig)


def test_verify_signature_rejects_tampered_body():
    secret = "s"
    body = b"{}"
    sig = compute_signature(secret, body)
    assert not verify_signature(secret, b"tampered", sig)


def test_verify_signature_rejects_wrong_secret():
    body = b"{}"
    sig = compute_signature("right", body)
    assert not verify_signature("wrong", body, sig)


def test_verify_signature_rejects_empty_inputs():
    assert not verify_signature("", b"x", "sha256=abc")
    assert not verify_signature("s", b"", "sha256=abc")
    assert not verify_signature("s", b"x", "")


def test_parse_meter_form_payload_extracts_data_field():
    out = parse_meter_form_payload({"data": '{"device":{"device_sn":"z6-1"},"readings":[]}'})
    assert out["device"]["device_sn"] == "z6-1"


def test_parse_meter_form_payload_missing_data_raises():
    with pytest.raises(ValueError):
        parse_meter_form_payload({})


def test_parse_meter_form_payload_invalid_json_raises():
    with pytest.raises(ValueError):
        parse_meter_form_payload({"data": "not-json"})
