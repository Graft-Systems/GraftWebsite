"""Pessl normalizer tests (M1.5 PR-D step 11)."""

from __future__ import annotations

from decimal import Decimal

from spray.connectors.sensors.pessl.normalizer import normalize_data_response


def _payload(timestamps, channels):
    return {
        "name": {"original_name": "test"},
        "dates": timestamps,
        "data": channels,
    }


def test_happy_path_full_channels():
    rows = normalize_data_response(
        _payload(
            ["2026-05-07 03:00:00", "2026-05-07 04:00:00"],
            {
                "0": {"ch": "air_temp", "unit": "C", "values": {"avg": [18.2, 19.1]}},
                "1": {"ch": "humidity", "unit": "%", "values": {"avg": [88, 75]}},
                "2": {
                    "ch": "leaf_wetness",
                    "unit": "min",
                    "values": {"sum": [45, 12]},
                },
                "3": {"ch": "precip", "unit": "mm", "values": {"sum": [0, 0.5]}},
                "4": {"ch": "wind_speed", "unit": "m/s", "values": {"avg": [1.4, 2.1]}},
            },
        )
    )
    assert len(rows) == 2
    assert rows[0]["air_temp_c"] == Decimal("18.20")
    assert rows[0]["rh_pct"] == Decimal("88.00")
    assert rows[0]["leaf_wetness_min"] == Decimal("45.00")
    assert rows[1]["precip_mm"] == Decimal("0.50")
    assert rows[1]["wind_speed_ms"] == Decimal("2.10")
    # Timestamps are tz-aware UTC.
    assert rows[0]["ts"].tzinfo is not None
    assert rows[0]["ts"].hour == 3


def test_missing_channels_skipped_gracefully():
    rows = normalize_data_response(
        _payload(
            ["2026-05-07 03:00:00"],
            {"0": {"ch": "air_temp", "values": {"avg": [22.0]}}},
        )
    )
    assert len(rows) == 1
    assert rows[0]["air_temp_c"] == Decimal("22.00")
    assert "rh_pct" not in rows[0]


def test_empty_payload_returns_empty():
    assert normalize_data_response({}) == []
    assert normalize_data_response({"dates": [], "data": {}}) == []


def test_unknown_channel_dropped():
    rows = normalize_data_response(
        _payload(
            ["2026-05-07 03:00:00"],
            {
                "0": {"ch": "soil_volumetric_water_content", "values": {"avg": [42]}},
                "1": {"ch": "air_temp", "values": {"avg": [18]}},
            },
        )
    )
    # Unknown channel skipped, known channel kept.
    assert len(rows) == 1
    assert rows[0]["air_temp_c"] == Decimal("18.00")
    assert "soil_volumetric_water_content" not in rows[0]


def test_null_values_drop_field_not_row():
    rows = normalize_data_response(
        _payload(
            ["2026-05-07 03:00:00"],
            {
                "0": {"ch": "air_temp", "values": {"avg": [None]}},
                "1": {"ch": "humidity", "values": {"avg": [80]}},
            },
        )
    )
    assert len(rows) == 1
    assert "air_temp_c" not in rows[0]
    assert rows[0]["rh_pct"] == Decimal("80.00")


def test_malformed_timestamp_skipped():
    rows = normalize_data_response(
        _payload(
            ["not-a-date", "2026-05-07 03:00:00"],
            {"0": {"ch": "air_temp", "values": {"avg": [18, 19]}}},
        )
    )
    assert len(rows) == 1
    assert rows[0]["air_temp_c"] == Decimal("19.00")
