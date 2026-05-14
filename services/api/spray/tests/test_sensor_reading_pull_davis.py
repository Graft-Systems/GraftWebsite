"""Davis-specific sensor pull window rules (WeatherLink v2 historic limits)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from spray.sensor_reading_pull import (
    DAVIS_HISTORIC_MAX_RANGE,
    davis_clamp_historic_since,
)


def test_davis_clamp_first_pull_two_week_watermark_to_24h():
    now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    since = now - timedelta(days=14)
    out = davis_clamp_historic_since(since, now)
    assert out == now - DAVIS_HISTORIC_MAX_RANGE


def test_davis_clamp_very_recent_since_uses_3h_floor():
    now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    since = now - timedelta(minutes=5)
    out = davis_clamp_historic_since(since, now)
    assert out == now - timedelta(hours=3)


def test_davis_clamp_mid_range_stays_inside_24h_cap():
    now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    since = now - timedelta(hours=12)
    out = davis_clamp_historic_since(since, now)
    assert out == since
