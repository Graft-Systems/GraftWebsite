"""Gubler–Thomas conidial PMI — daily state machine (UTC calendar days, MVP).

Favourable band is **70–85 °F** inclusive → Celsius [21.111…, 29.444…].
Heat penalty uses **≥35 °C** as an hourly proxy for “15 minutes at 95 °F”
when only hourly data exists.

Daily net change rule (after the conidial trigger activates PMI at 60):

1. Start with **+20** if the day has **≥6 consecutive hours** in the favourable
   band; otherwise **−10**.
2. If **any hour** reaches **≥35 °C**, subtract **10** more (heat spike day).
3. Clamp the **day’s net delta** to the interval **[−10, +20]** before applying
   to PMI, then clamp PMI to **[0, 100]**.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

from spray.aggregation.runners.base import HourlyObservation

# 70 °F and 85 °F — exact rational bounds.
FAVOURABLE_TEMP_C_LO = (70.0 - 32.0) * 5.0 / 9.0
FAVOURABLE_TEMP_C_HI = (85.0 - 32.0) * 5.0 / 9.0
HEAT_SPIKE_TEMP_C = 35.0
FAVOURABLE_RUN_HOURS = 6


def default_budbreak_date(calendar_year: int) -> date:
    """Default monitoring start when `block.settings['budbreak_date']` is absent."""
    return date(calendar_year, 4, 1)


def pmi_risk_tier(pmi: int) -> str:
    """Discrete risk tier for UI and storage (explicit 31–39 and 61–69 = moderate)."""
    if pmi <= 30:
        return "low"
    if pmi <= 69:
        return "moderate"
    return "high"


def _utc_date(ts: datetime) -> date:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc).date()


def _group_by_utc_day(
    hourly: Iterable[HourlyObservation],
    *,
    budbreak: date,
    through_date: date,
) -> dict[date, list[HourlyObservation]]:
    by_day: dict[date, list[HourlyObservation]] = defaultdict(list)
    for o in hourly:
        d = _utc_date(o.ts)
        if d < budbreak or d > through_date:
            continue
        by_day[d].append(o)
    for d in by_day:
        by_day[d].sort(key=lambda x: x.ts)
    return by_day


def _longest_consecutive_favourable_hours(obs: list[HourlyObservation]) -> float:
    streak = 0.0
    best = 0.0
    for o in obs:
        if o.temp_c is None:
            streak = 0.0
            continue
        if FAVOURABLE_TEMP_C_LO <= o.temp_c <= FAVOURABLE_TEMP_C_HI:
            streak += 1.0
            best = max(best, streak)
        else:
            streak = 0.0
    return best


def _day_min_max_temps(obs: list[HourlyObservation]) -> tuple[float | None, float | None]:
    temps = [o.temp_c for o in obs if o.temp_c is not None]
    if not temps:
        return None, None
    return min(temps), max(temps)


def _heat_spike_day(obs: list[HourlyObservation]) -> bool:
    return any(o.temp_c is not None and o.temp_c >= HEAT_SPIKE_TEMP_C for o in obs)


def _data_sources_summary(obs: list[HourlyObservation]) -> dict[str, Any]:
    hours_with_temp = 0
    onsite = 0
    regional = 0
    other = 0
    for o in obs:
        if o.temp_c is None:
            continue
        hours_with_temp += 1
        kinds = (o.source_summary or {}).get("source_kinds") or []
        if "block_sensor" in kinds:
            onsite += 1
        elif any(k in kinds for k in ("regional_station", "forecast")):
            regional += 1
        else:
            other += 1
    denom = max(1, hours_with_temp)
    return {
        "hours_with_temperature": hours_with_temp,
        "onsite_sensor_pct": round(100.0 * onsite / denom, 1),
        "regional_fallback_pct": round(100.0 * regional / denom, 1),
        "other_pct": round(100.0 * other / denom, 1),
    }


def _hourly_temp_strip(obs: list[HourlyObservation], max_points: int = 24) -> list[dict[str, Any]]:
    """Compact last up to `max_points` hourly temps for tooltips (UTC order)."""
    with_t = [(o.ts, o.temp_c) for o in obs if o.temp_c is not None]
    if not with_t:
        return []
    tail = with_t[-max_points:]
    return [{"ts": ts.isoformat(), "temp_c": round(t, 2)} for ts, t in tail]


@dataclass
class ConidialDayRollup:
    """One calendar day of PMI output (maps to ``BlockPowderyMildewIndex``)."""

    date: date
    pmi: int
    phase: str
    risk_tier: str
    details: dict[str, Any]


def compute_conidial_daily_rollups(
    hourly: Iterable[HourlyObservation],
    *,
    budbreak: date,
    through_date: date,
) -> list[ConidialDayRollup]:
    """Compute daily PMI rows from budbreak through ``through_date`` (inclusive)."""
    by_day = _group_by_utc_day(hourly, budbreak=budbreak, through_date=through_date)

    phase = "inactive"
    pmi = 0
    trigger_streak = 0
    out: list[ConidialDayRollup] = []

    d = budbreak
    while d <= through_date:
        streak_at_day_start = trigger_streak
        obs = by_day.get(d, [])
        longest_run_h = _longest_consecutive_favourable_hours(obs)
        favourable = longest_run_h >= FAVOURABLE_RUN_HOURS
        heat = _heat_spike_day(obs)
        min_c, max_c = _day_min_max_temps(obs)
        phase_before = phase
        pmi_before = pmi
        rule_lines: list[str] = []
        daily_delta = 0
        triggered_today = False

        if phase == "inactive":
            if favourable:
                trigger_streak += 1
                rule_lines.append(
                    f"Favourable day: longest in-band run {longest_run_h:.1f}h "
                    f"(need {FAVOURABLE_RUN_HOURS}h in {FAVOURABLE_TEMP_C_LO:.2f}–{FAVOURABLE_TEMP_C_HI:.2f}°C)"
                )
            else:
                if trigger_streak:
                    rule_lines.append(
                        "Trigger streak reset: day did not reach 6 consecutive favourable hours."
                    )
                trigger_streak = 0

            if trigger_streak >= 3:
                phase = "active"
                triggered_today = True
                daily_delta = 60 - pmi_before
                pmi = 60
                trigger_streak = 0
                rule_lines.append(
                    "Conidial trigger: 3 consecutive calendar days each with ≥6h "
                    "in favourable band → PMI set to 60, phase active."
                )
            else:
                pmi = 0
                daily_delta = 0 - pmi_before
        else:
            # --- Active: end-of-day accumulation ---
            if favourable:
                delta = 20
                rule_lines.append(
                    f"+20: ≥{FAVOURABLE_RUN_HOURS} consecutive in-band hours "
                    f"(longest run {longest_run_h:.1f}h)."
                )
            else:
                delta = -10
                rule_lines.append(
                    f"−10: fewer than {FAVOURABLE_RUN_HOURS} consecutive in-band hours "
                    f"(longest run {longest_run_h:.1f}h)."
                )
            if heat:
                delta -= 10
                rule_lines.append(
                    "−10: heat proxy — at least one hour ≥35°C (hourly stand-in for 15 min at 95°F)."
                )
            raw_delta = delta
            delta = max(-10, min(20, delta))
            if delta != raw_delta:
                rule_lines.append(
                    f"Daily net clamped to [−10, +20] before applying (computed {raw_delta})."
                )
            daily_delta = delta
            pmi = max(0, min(100, pmi + delta))

        ds = _data_sources_summary(obs)
        details: dict[str, Any] = {
            "budbreak_date": budbreak.isoformat(),
            "phase_before": phase_before,
            "phase_after": phase,
            "pmi_before": pmi_before,
            "pmi_after": pmi,
            "daily_delta": daily_delta,
            "rule_lines": rule_lines,
            "max_temp_c": None if max_c is None else round(max_c, 3),
            "min_temp_c": None if min_c is None else round(min_c, 3),
            "longest_favourable_run_hours": round(longest_run_h, 3),
            "favourable_six_hour_met": favourable,
            "heat_spike_day": heat,
            "triggered_three_day_streak": triggered_today,
            "inactive_trigger_streak_at_day_start": (
                streak_at_day_start if phase_before == "inactive" else None
            ),
            "inactive_trigger_streak_after_day": (
                trigger_streak if phase_before == "inactive" else None
            ),
            "data_sources_summary": ds,
            "hourly_temp_strip_utc": _hourly_temp_strip(obs),
        }

        out.append(
            ConidialDayRollup(
                date=d,
                pmi=pmi,
                phase=phase,
                risk_tier=pmi_risk_tier(pmi),
                details=details,
            )
        )
        d += timedelta(days=1)

    return out


def build_latest_pmi_explain(
    *,
    block_id: str,
    pmi: int,
    tier: str,
    index_date: date,
    details: dict[str, Any],
) -> dict[str, Any]:
    """Structured one-liner + bullets for dashboard first paint."""
    rules = list(details.get("rule_lines") or [])
    ds = details.get("data_sources_summary") or {}
    headline = (
        f"Powdery mildew index {pmi} ({tier}) on {index_date.isoformat()}: "
        f"{rules[0] if rules else 'no rule summary'}."
    )
    return {
        "headline": headline,
        "rules_applied_last_day": rules,
        "data_sources": ds,
        "link_to_forecasts": f"/spray/forecasts?block={block_id}",
    }
