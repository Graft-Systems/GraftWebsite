"""METER normalizer tests (M1.5 PR-E step 8)."""

from __future__ import annotations

from decimal import Decimal

import pytest

from spray.connectors.sensors.meter.normalizer import (
    normalize_poll_response,
    normalize_push_payload,
)


# ---------------------------------------------------------------------
# Poll payload
# ---------------------------------------------------------------------


def test_normalize_poll_response_full():
    payload = {
        "device": {"device_sn": "z6-12345"},
        "data": {
            "Air Temperature": {
                "values": [
                    {"datetime": "2026-05-07 03:00:00+00:00", "value": 18.4},
                    {"datetime": "2026-05-07 04:00:00+00:00", "value": 19.1},
                ]
            },
            "Relative Humidity": {
                "values": [
                    {"datetime": "2026-05-07 03:00:00+00:00", "value": 88},
                ]
            },
        },
    }
    rows = normalize_poll_response(payload)
    assert len(rows) == 2
    assert rows[0]["air_temp_c"] == Decimal("18.40")
    assert rows[0]["rh_pct"] == Decimal("88.00")
    # Hour 04 has temp but no humidity.
    assert rows[1]["air_temp_c"] == Decimal("19.10")
    assert "rh_pct" not in rows[1]


def test_normalize_poll_response_empty():
    assert normalize_poll_response({}) == []
    assert normalize_poll_response({"data": {}}) == []


def test_normalize_poll_response_unknown_measurement_dropped():
    payload = {
        "data": {
            "Soil VWC": {
                "values": [{"datetime": "2026-05-07 03:00:00+00:00", "value": 0.42}]
            },
            "Air Temperature": {
                "values": [{"datetime": "2026-05-07 03:00:00+00:00", "value": 20}]
            },
        }
    }
    rows = normalize_poll_response(payload)
    assert len(rows) == 1
    assert rows[0]["air_temp_c"] == Decimal("20.00")
    assert "soil_vwc" not in rows[0]


# ---------------------------------------------------------------------
# Push payload
# ---------------------------------------------------------------------


def test_normalize_push_payload_happy_path():
    payload = {
        "device": {"device_sn": "z6-12345"},
        "readings": [
            {
                "datetime": "2026-05-07T03:00:00Z",
                "measurements": [
                    {"name": "Air Temperature", "value": 18.4, "units": "°C"},
                    {"name": "Relative Humidity", "value": 88},
                    {"name": "Leaf Wetness Duration", "value": 42},
                ],
            }
        ],
    }
    sn, rows = normalize_push_payload(payload)
    assert sn == "z6-12345"
    assert len(rows) == 1
    assert rows[0]["air_temp_c"] == Decimal("18.40")
    assert rows[0]["rh_pct"] == Decimal("88.00")
    assert rows[0]["leaf_wetness_min"] == Decimal("42.00")


def test_normalize_push_payload_missing_device_sn_raises():
    payload = {"device": {}, "readings": []}
    with pytest.raises(ValueError):
        normalize_push_payload(payload)


def test_normalize_push_payload_no_lw_persists_other_fields():
    """ATMOS-41 without PHYTOS-31 has no LW; other fields should still pass."""
    payload = {
        "device": {"device_sn": "z6-99"},
        "readings": [
            {
                "datetime": "2026-05-07T03:00:00Z",
                "measurements": [
                    {"name": "Air Temperature", "value": 18.4},
                    {"name": "Relative Humidity", "value": 88},
                ],
            }
        ],
    }
    sn, rows = normalize_push_payload(payload)
    assert sn == "z6-99"
    assert "leaf_wetness_min" not in rows[0]
    assert rows[0]["air_temp_c"] == Decimal("18.40")
