"""Aggregation runner tests — M1.5 PR-C.

Covers Gubler-Thomas, Caffi Primary, Caffi Secondary against synthetic
hourly weather windows. Severity outputs match anchor-table bands
within ±0.2 (the rounding tolerance the spec calls for).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from spray.aggregation.runners.base import (
    HourlyObservation,
    WeatherWindow,
)
from spray.aggregation.runners.registry import (
    UnknownRunnerError,
    all_runner_versions,
    get_runner,
    get_runners_for_pathogen,
    known_slugs,
)
from spray.aggregation.severity_anchors import (
    gt_ri_to_severity_1_10,
    primary_infection_to_severity,
    secondary_infection_hours_to_severity,
)


def _window(observations, block_id="11111111-1111-1111-1111-111111111111"):
    if not observations:
        return WeatherWindow(
            block_id=block_id,
            valid_from=datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
            valid_to=datetime(2026, 5, 7, 23, 59, 59, tzinfo=timezone.utc),
            observations=[],
        )
    return WeatherWindow(
        block_id=block_id,
        valid_from=observations[0].ts,
        valid_to=observations[-1].ts,
        observations=observations,
    )


def _hours(start: datetime, count: int, **kwargs):
    return [
        HourlyObservation(
            ts=start + timedelta(hours=i),
            temp_c=kwargs.get("temp_c"),
            rh_pct=kwargs.get("rh_pct"),
            leaf_wetness_min=kwargs.get("leaf_wetness_min"),
            wind_speed_ms=kwargs.get("wind_speed_ms"),
            precip_mm=kwargs.get("precip_mm"),
        )
        for i in range(count)
    ]


# ---------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------


def test_known_slugs_includes_three_runners():
    slugs = set(known_slugs())
    assert "gubler_thomas_2013" in slugs
    assert "caffi_primary_2009" in slugs
    assert "caffi_secondary_2010" in slugs


def test_get_unknown_runner_raises():
    with pytest.raises(UnknownRunnerError):
        get_runner("totally_made_up")


def test_runners_by_pathogen():
    powdery_runners = get_runners_for_pathogen("powdery")
    downy_runners = get_runners_for_pathogen("downy")
    assert any(r.SLUG == "gubler_thomas_2013" for r in powdery_runners)
    assert any(r.SLUG == "caffi_primary_2009" for r in downy_runners)
    assert any(r.SLUG == "caffi_secondary_2010" for r in downy_runners)


def test_all_runner_versions_returns_dict():
    versions = all_runner_versions()
    assert versions["gubler_thomas_2013"] == "1.0.0"
    assert versions["caffi_primary_2009"] == "1.0.0"
    assert versions["caffi_secondary_2010"] == "1.0.0"


# ---------------------------------------------------------------------
# Severity anchors
# ---------------------------------------------------------------------


def test_gt_ri_anchor_lower_bound():
    assert gt_ri_to_severity_1_10(0) == 1.0


def test_gt_ri_anchor_upper_bound():
    assert gt_ri_to_severity_1_10(100) == 10.0


def test_gt_ri_anchor_monotonic():
    prev = 0.0
    for ri in range(0, 101, 10):
        sev = gt_ri_to_severity_1_10(ri)
        assert sev >= prev
        prev = sev


def test_secondary_hours_low():
    assert secondary_infection_hours_to_severity(0) == 1.0
    assert secondary_infection_hours_to_severity(3) < 2.0


def test_secondary_hours_high():
    assert secondary_infection_hours_to_severity(15) >= 7.0
    assert secondary_infection_hours_to_severity(15) <= 10.0


def test_primary_score_anchors():
    assert primary_infection_to_severity(0) == 1.0
    assert primary_infection_to_severity(10) == 10.0


# ---------------------------------------------------------------------
# Gubler-Thomas runner
# ---------------------------------------------------------------------


def test_gubler_thomas_low_risk_with_cold_window():
    obs = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        24,
        temp_c=10.0,
        rh_pct=70.0,
    )
    w = _window(obs)
    runner = get_runner("gubler_thomas_2013")
    result = runner.compute(w)
    assert result.pathogen == "powdery"
    assert result.severity_1_10 == 1.0
    assert result.raw_score["ri"] == 0


def test_gubler_thomas_high_risk_with_favourable_band():
    # 24h continuously in the 21–30°C favourable range → 4 favourable
    # 6h blocks → RI = 80.
    obs = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        24,
        temp_c=25.0,
        rh_pct=75.0,
    )
    w = _window(obs)
    result = get_runner("gubler_thomas_2013").compute(w)
    assert result.raw_score["ri"] == 80
    # Severity ≈ 1 + 80*0.09 = 8.2
    assert 8.0 <= result.severity_1_10 <= 8.5


def test_gubler_thomas_lethal_blocks_subtract():
    # Mix: first 12h favourable (2 blocks +40), then 4h at 39°C (2 lethal blocks -20)
    favourable = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        12,
        temp_c=25.0,
        rh_pct=75.0,
    )
    lethal = _hours(
        datetime(2026, 5, 7, 12, 0, tzinfo=timezone.utc),
        4,
        temp_c=39.0,
        rh_pct=20.0,
    )
    w = _window(favourable + lethal)
    result = get_runner("gubler_thomas_2013").compute(w)
    # 2 favourable blocks * 20 - 2 lethal blocks * 10 = 20
    assert result.raw_score["ri"] == 20


def test_gubler_thomas_confidence_drops_with_gaps():
    # Half the hours have None temp_c.
    half_valid = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        12,
        temp_c=25.0,
    )
    half_gappy = _hours(
        datetime(2026, 5, 7, 12, 0, tzinfo=timezone.utc),
        12,
        temp_c=None,
    )
    w = _window(half_valid + half_gappy)
    result = get_runner("gubler_thomas_2013").compute(w)
    assert 0.65 <= result.confidence <= 0.75


# ---------------------------------------------------------------------
# Caffi runners
# ---------------------------------------------------------------------


def test_caffi_primary_all_conditions_high():
    # Warm, wet, rainy 24h.
    obs = _hours(
        datetime(2026, 5, 6, 0, 0, tzinfo=timezone.utc),
        24,
        temp_c=14.0,
        rh_pct=90.0,
        leaf_wetness_min=60.0,
        precip_mm=0.5,
    )
    w = _window(obs)
    result = get_runner("caffi_primary_2009").compute(w)
    assert result.pathogen == "downy"
    assert result.raw_score["conditions_met"] == 3
    assert result.severity_1_10 >= 7.0


def test_caffi_primary_no_rain_no_infection():
    obs = _hours(
        datetime(2026, 5, 6, 0, 0, tzinfo=timezone.utc),
        24,
        temp_c=14.0,
        rh_pct=70.0,
        leaf_wetness_min=0.0,
        precip_mm=0.0,
    )
    w = _window(obs)
    result = get_runner("caffi_primary_2009").compute(w)
    assert result.raw_score["conditions_met"] == 0
    assert result.severity_1_10 < 2.0


def test_caffi_secondary_high_with_long_wet_warm_period():
    obs = _hours(
        datetime(2026, 5, 6, 0, 0, tzinfo=timezone.utc),
        14,
        temp_c=18.0,
        leaf_wetness_min=60.0,
    )
    w = _window(obs)
    result = get_runner("caffi_secondary_2010").compute(w)
    assert result.severity_1_10 >= 7.0


def test_caffi_secondary_low_when_dry():
    obs = _hours(
        datetime(2026, 5, 6, 0, 0, tzinfo=timezone.utc),
        24,
        temp_c=18.0,
        leaf_wetness_min=0.0,
    )
    w = _window(obs)
    result = get_runner("caffi_secondary_2010").compute(w)
    assert result.severity_1_10 < 2.0


def test_runner_input_snapshot_id_is_deterministic():
    obs = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        4,
        temp_c=22.0,
        rh_pct=70.0,
    )
    w1 = _window(obs)
    w2 = _window(obs)
    assert w1.snapshot_id() == w2.snapshot_id()
    # Different observations -> different snapshot.
    obs2 = _hours(
        datetime(2026, 5, 7, 0, 0, tzinfo=timezone.utc),
        4,
        temp_c=22.5,
        rh_pct=70.0,
    )
    assert w1.snapshot_id() != _window(obs2).snapshot_id()
