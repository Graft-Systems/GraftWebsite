"""Semantic weather/sensor fusion tests."""

from __future__ import annotations

from datetime import datetime, timezone

from spray.aggregation.weather_fusion import EvidenceObservation, fuse_hourly_evidence


def test_fusion_prefers_block_sensor_over_weather_api():
    ts = datetime(2026, 5, 12, 10, 0, tzinfo=timezone.utc)
    [hour] = fuse_hourly_evidence(
        [
            EvidenceObservation(
                ts=ts,
                source="visual_crossing:grid",
                source_kind="weather_api",
                quality=0.9,
                temp_c=30.0,
            ),
            EvidenceObservation(
                ts=ts,
                source="davis:block",
                source_kind="block_sensor",
                quality=0.95,
                temp_c=20.0,
            ),
        ]
    )

    assert hour.temp_c < 25.0
    assert "davis:block" in hour.source_summary["sources"]
    assert "visual_crossing:grid" in hour.source_summary["sources"]
    assert hour.fusion_confidence > 0.5


def test_fusion_combines_complementary_sensor_fields():
    ts = datetime(2026, 5, 12, 11, 0, tzinfo=timezone.utc)
    [hour] = fuse_hourly_evidence(
        [
            EvidenceObservation(
                ts=ts,
                source="davis:block",
                source_kind="block_sensor",
                temp_c=24.0,
            ),
            EvidenceObservation(
                ts=ts,
                source="pessl:block",
                source_kind="block_sensor",
                leaf_wetness_min=45.0,
            ),
        ]
    )

    assert hour.temp_c == 24.0
    assert hour.leaf_wetness_min == 45.0
    assert set(hour.source_summary["sources"]) == {"davis:block", "pessl:block"}
