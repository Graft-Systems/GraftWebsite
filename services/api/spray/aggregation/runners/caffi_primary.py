"""Caffi Primary Infection model for downy mildew (*Plasmopara viticola*).

Based on Caffi et al. 2009 mechanistic primary infection model
(`docs/research/06_outbreak-prediction.md` source 06-S5). Models
oospore germination → primary lesion appearance.

### Algorithm (Year-0 simplified)

Primary infection requires three conditions in concert over a 24h
window ending at `valid_to`:

1. **Cumulative rain ≥ 2 mm** in the last 24h (oospores need water to germinate).
2. **Soil/leaf wetness ≥ 8 hours** during a window where T ≥ 11°C.
3. **Mean air temp ≥ 11°C** during the wetness window.

If all three fire, primary infection probability is high (severity 6+);
two of three is moderate (severity 3-5); one or zero is low (1-2).

Severity 1–10 mapping per the Brischetto banding from
`docs/research/12_recommendation-engine-patterns.md` §6, applied to a
0–10 raw downy "primary infection probability" surrogate.

### Caveats

The published Caffi 2009 paper specifies a more nuanced energy
balance + cardinal-temperature relation; this Year-0 implementation
captures the qualitative gating without the full equations. The full
model lands in PR-C.5 once we have validation data from a real Napa
season.
"""

from __future__ import annotations

from spray.aggregation.runners.base import (
    HourlyObservation,
    ModelRunner,
    RiskRecordResult,
    ThresholdHit,
    WeatherWindow,
)
from spray.aggregation.runners.registry import register_runner


CUMULATIVE_RAIN_MM_THRESHOLD = 2.0
WETNESS_HOURS_REQUIRED = 8
WETNESS_TEMP_MIN_C = 11.0
WETNESS_TEMP_MEAN_MIN_C = 11.0


def _last_24h(window: WeatherWindow) -> list[HourlyObservation]:
    """Trim observations to the last 24 hours of the window."""
    if not window.observations:
        return []
    end = window.valid_to
    cutoff = end.replace(microsecond=0)
    # Take observations whose ts is within (end - 24h, end].
    return [
        o
        for o in window.observations
        if (cutoff - o.ts).total_seconds() <= 86400
        and o.ts <= cutoff
    ]


@register_runner
class CaffiPrimaryRunner:
    SLUG = "caffi_primary_2009"
    VERSION = "1.0.0"
    PATHOGEN = "downy"
    CITATION_ID = "06-S5"

    def compute(self, window: WeatherWindow) -> RiskRecordResult:
        from spray.aggregation.severity_anchors import primary_infection_to_severity

        obs = _last_24h(window) or window.observations

        cumulative_rain = sum(
            (o.precip_mm or 0.0) for o in obs if o.precip_mm is not None
        )

        wetness_hours_warm = 0
        valid_temps = []
        for o in obs:
            if o.temp_c is not None:
                valid_temps.append(o.temp_c)
            wet = (o.leaf_wetness_min or 0.0) >= 30.0  # ≥30 min = "wet hour"
            if wet and o.temp_c is not None and o.temp_c >= WETNESS_TEMP_MIN_C:
                wetness_hours_warm += 1

        mean_temp = sum(valid_temps) / len(valid_temps) if valid_temps else 0.0

        cond_rain = cumulative_rain >= CUMULATIVE_RAIN_MM_THRESHOLD
        cond_wetness = wetness_hours_warm >= WETNESS_HOURS_REQUIRED
        cond_temp = mean_temp >= WETNESS_TEMP_MEAN_MIN_C

        conditions_met = sum([cond_rain, cond_wetness, cond_temp])

        # 0..10 surrogate score.
        if conditions_met == 3:
            primary_score = 8.5
        elif conditions_met == 2:
            primary_score = 5.0
        elif conditions_met == 1:
            primary_score = 2.5
        else:
            primary_score = 0.5

        thresholds_fired: list[ThresholdHit] = []
        if cond_rain:
            thresholds_fired.append(
                ThresholdHit(
                    name=f"cumulative_rain_{cumulative_rain:.1f}mm>=2.0mm",
                    citation_id="06-S5",
                )
            )
        if cond_wetness:
            thresholds_fired.append(
                ThresholdHit(
                    name=f"wetness_warm_{wetness_hours_warm}h>=8h",
                    citation_id="06-S5",
                )
            )
        if cond_temp:
            thresholds_fired.append(
                ThresholdHit(
                    name=f"mean_temp_{mean_temp:.1f}C>=11C",
                    citation_id="06-S5",
                )
            )

        valid_count = sum(1 for o in obs if o.temp_c is not None)
        coverage = valid_count / max(1, len(obs))
        confidence = round(0.35 + 0.55 * coverage, 4)

        severity = primary_infection_to_severity(primary_score)

        return RiskRecordResult(
            model_id=self.SLUG,
            model_version=self.VERSION,
            block_id=window.block_id,
            valid_from=window.valid_from,
            valid_to=window.valid_to,
            pathogen=self.PATHOGEN,
            severity_1_10=severity,
            raw_score={
                "primary_score": primary_score,
                "conditions_met": conditions_met,
                "cumulative_rain_mm": round(cumulative_rain, 2),
                "wetness_hours_warm": wetness_hours_warm,
                "mean_temp_c": round(mean_temp, 2),
                "valid_hour_coverage": round(coverage, 3),
            },
            thresholds_fired=thresholds_fired,
            input_snapshot_id=window.snapshot_id(),
            confidence=confidence,
            citation_id=self.CITATION_ID,
        )
