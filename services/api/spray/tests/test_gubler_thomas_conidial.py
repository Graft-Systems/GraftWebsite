"""Unit tests for Gubler–Thomas conidial PMI daily state machine."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from spray.aggregation.runners.base import HourlyObservation
from spray.aggregation.pmi.gubler_thomas_conidial import (
    FAVOURABLE_TEMP_C_HI,
    FAVOURABLE_TEMP_C_LO,
    compute_conidial_daily_rollups,
    default_budbreak_date,
    pmi_risk_tier,
)


def _hour(
    day: date,
    hour: int,
    temp_c: float | None,
    *,
    kinds: tuple[str, ...] = ("block_sensor",),
) -> HourlyObservation:
    return HourlyObservation(
        ts=datetime(day.year, day.month, day.day, hour, 0, 0, tzinfo=timezone.utc),
        temp_c=temp_c,
        rh_pct=None,
        leaf_wetness_min=None,
        wind_speed_ms=None,
        precip_mm=None,
        source_summary={"source_kinds": list(kinds)},
        fusion_confidence=0.9,
    )


def _favourable_temp() -> float:
    return (FAVOURABLE_TEMP_C_LO + FAVOURABLE_TEMP_C_HI) / 2.0


def test_pmi_risk_tier_bands() -> None:
    assert pmi_risk_tier(0) == "low"
    assert pmi_risk_tier(30) == "low"
    assert pmi_risk_tier(31) == "moderate"
    assert pmi_risk_tier(60) == "moderate"
    assert pmi_risk_tier(69) == "moderate"
    assert pmi_risk_tier(70) == "high"


def test_default_budbreak() -> None:
    assert default_budbreak_date(2026) == date(2026, 4, 1)


def test_trigger_three_consecutive_favourable_days_sets_pmi_60() -> None:
    bud = date(2026, 5, 1)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))

    roll = compute_conidial_daily_rollups(
        hours, budbreak=bud, through_date=bud + timedelta(days=2)
    )
    assert roll[0].pmi == 0 and roll[0].phase == "inactive"
    assert roll[1].pmi == 0 and roll[1].phase == "inactive"
    assert roll[2].pmi == 60 and roll[2].phase == "active"
    assert roll[2].details["triggered_three_day_streak"] is True
    assert any("Conidial trigger" in x for x in roll[2].details["rule_lines"])


def test_inactive_resets_streak_when_day_not_favourable() -> None:
    bud = date(2026, 6, 1)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for d in (bud, bud + timedelta(days=1)):
        for h in range(6):
            hours.append(_hour(d, h, t))
    gap = bud + timedelta(days=2)
    hours.append(_hour(gap, 10, 2.0))
    d3 = bud + timedelta(days=3)
    for h in range(6):
        hours.append(_hour(d3, h, t))

    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=d3)
    assert roll[3].phase == "inactive"
    assert roll[3].pmi == 0


def test_active_plus_20_favourable() -> None:
    bud = date(2026, 7, 1)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))
    d4 = bud + timedelta(days=3)
    for h in range(6):
        hours.append(_hour(d4, h, t))

    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=d4)
    assert roll[2].pmi == 60
    assert roll[3].pmi == 80
    assert roll[3].details["daily_delta"] == 20


def test_active_minus_10_not_favourable() -> None:
    bud = date(2026, 7, 10)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))
    d4 = bud + timedelta(days=3)
    hours.append(_hour(d4, 10, 2.0))

    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=d4)
    assert roll[3].pmi == 50
    assert roll[3].details["daily_delta"] == -10
    assert roll[3].details["favourable_six_hour_met"] is False


def test_heat_spike_extra_minus_10() -> None:
    bud = date(2026, 7, 20)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))
    d4 = bud + timedelta(days=3)
    for h in range(6):
        hours.append(_hour(d4, h, t))
    hours.append(_hour(d4, 18, 36.0))

    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=d4)
    assert roll[3].details["heat_spike_day"] is True
    assert roll[3].details["daily_delta"] == 10
    assert roll[3].pmi == 70


def test_daily_net_clamped_to_minus_10() -> None:
    bud = date(2026, 8, 1)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))
    d4 = bud + timedelta(days=3)
    hours.append(_hour(d4, 10, 2.0))
    hours.append(_hour(d4, 14, 36.0))

    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=d4)
    assert roll[3].details["daily_delta"] == -10
    assert roll[3].pmi == 50


def test_pmi_clamps_at_100() -> None:
    bud = date(2026, 8, 10)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for offset in range(3):
        d = bud + timedelta(days=offset)
        for h in range(6):
            hours.append(_hour(d, h, t))
        hours.append(_hour(d, 12, 5.0))
    for i in range(5):
        d = bud + timedelta(days=3 + i)
        for h in range(6):
            hours.append(_hour(d, h, t))

    end = bud + timedelta(days=7)
    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=end)
    assert roll[-1].pmi == 100


def test_provenance_data_sources_split() -> None:
    bud = date(2026, 9, 1)
    t = _favourable_temp()
    obs = [
        _hour(bud, 0, t, kinds=("block_sensor",)),
        _hour(bud, 1, t, kinds=("regional_station",)),
        _hour(bud, 2, None, kinds=("regional_station",)),
    ]
    roll = compute_conidial_daily_rollups(obs, budbreak=bud, through_date=bud)
    ds = roll[0].details["data_sources_summary"]
    assert ds["hours_with_temperature"] == 2
    assert ds["onsite_sensor_pct"] == 50.0
    assert ds["regional_fallback_pct"] == 50.0


def test_missing_temp_resets_favourable_streak_same_day() -> None:
    bud = date(2026, 9, 10)
    t = _favourable_temp()
    hours: list[HourlyObservation] = []
    for h in range(3):
        hours.append(_hour(bud, h, t))
    hours.append(_hour(bud, 3, None))
    for h in range(4, 10):
        hours.append(_hour(bud, h, t))
    roll = compute_conidial_daily_rollups(hours, budbreak=bud, through_date=bud)
    assert roll[0].details["longest_favourable_run_hours"] >= 6.0
