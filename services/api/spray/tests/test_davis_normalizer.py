"""Davis normalizer tests (M1.5 PR-E step 8)."""

from __future__ import annotations

from decimal import Decimal

from spray.connectors.sensors.davis.normalizer import (
    davis_lw_to_minutes,
    normalize_historic_response,
)


def test_lw_0_15_to_minutes_correctness():
    # 0 → 0 min, 15 → 60 min, 7.5 → 30 min
    assert davis_lw_to_minutes(0) == Decimal("0.0")
    assert davis_lw_to_minutes(15) == Decimal("60.0")
    assert davis_lw_to_minutes(7.5) == Decimal("30.0")
    # Out-of-range values are clamped + logged.
    assert davis_lw_to_minutes(20) == Decimal("60.0")
    assert davis_lw_to_minutes(-5) == Decimal("0")
    assert davis_lw_to_minutes(None) is None
    assert davis_lw_to_minutes("not-a-number") is None


def test_normalize_historic_response_full_row():
    payload = {
        "sensors": [
            {
                "data": [
                    {
                        "ts": 1714824000,  # 2024-05-04 12:00 UTC
                        "temp_out": 65.1,  # °F
                        "hum_out": 82,
                        "wind_speed_avg": 4.5,  # mph
                        "rainfall_in": 0.0,
                        "wet_leaf_high_1": 12,
                    }
                ]
            }
        ]
    }
    rows = normalize_historic_response(payload)
    assert len(rows) == 1
    row = rows[0]
    # 65.1 °F = 18.39 °C
    assert row["air_temp_c"] == Decimal("18.39")
    assert row["rh_pct"] == Decimal("82.00")
    # 4.5 mph * 0.44704 = 2.01 m/s
    assert row["wind_speed_ms"] == Decimal("2.01")
    assert row["precip_mm"] == Decimal("0.00")
    # 12 * 4 = 48 min
    assert row["leaf_wetness_min"] == Decimal("48.0")


def test_normalize_handles_missing_fields():
    payload = {
        "sensors": [
            {
                "data": [
                    {"ts": 1714824000, "temp_out": 70.0}
                ]
            }
        ]
    }
    rows = normalize_historic_response(payload)
    assert len(rows) == 1
    assert "air_temp_c" in rows[0]
    assert "rh_pct" not in rows[0]
    assert "leaf_wetness_min" not in rows[0]


def test_normalize_drops_malformed_ts():
    payload = {
        "sensors": [
            {"data": [{"ts": "not-a-number", "temp_out": 70}]}
        ]
    }
    assert normalize_historic_response(payload) == []


def test_normalize_merges_two_sensor_blocks():
    payload = {
        "sensors": [
            {"data": [{"ts": 1714824000, "temp_out": 65}]},
            {"data": [{"ts": 1714824000, "wet_leaf_high_1": 8}]},
        ]
    }
    rows = normalize_historic_response(payload)
    assert len(rows) == 1
    # Both fields merged on the same timestamp.
    assert "air_temp_c" in rows[0]
    assert rows[0]["leaf_wetness_min"] == Decimal("32.0")


def test_normalize_empty_payload():
    assert normalize_historic_response({}) == []
    assert normalize_historic_response({"sensors": []}) == []
