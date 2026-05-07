"""Caffi Secondary Infection model for downy mildew.

Companion to `caffi_primary` covering the secondary cycles after
primary infection establishes. Caffi & Rossi 2010
(`docs/research/06_outbreak-prediction.md` source 06-S6).

### Algorithm (Year-0 simplified)

Secondary infection fires when leaf wetness duration AND temperature
fall in the favourable range:

  - **Wet hours within (10–25°C)** within a 24h window
  - 4–5 hours wet+warm → low secondary risk (severity 2–3)
  - 6–9 hours → moderate (severity 4–6)
  - ≥10 hours → high (severity 7–9)

The full Caffi 2010 model uses sporulation rate equations + cardinal
temperatures; Year-0 captures the qualitative wetness × temperature
gate. Full implementation deferred to PR-C.5.
"""

from __future__ import annotations

from spray.aggregation.runners.base import (
    ModelRunner,
    RiskRecordResult,
    ThresholdHit,
    WeatherWindow,
)
from spray.aggregation.runners.registry import register_runner


WETNESS_TEMP_LO = 10.0
WETNESS_TEMP_HI = 25.0


@register_runner
class CaffiSecondaryRunner:
    SLUG = "caffi_secondary_2010"
    VERSION = "1.0.0"
    PATHOGEN = "downy"
    CITATION_ID = "06-S6"

    def compute(self, window: WeatherWindow) -> RiskRecordResult:
        from spray.aggregation.severity_anchors import (
            secondary_infection_hours_to_severity,
        )

        wet_warm_hours = 0
        valid_count = 0

        for o in window.observations:
            if o.temp_c is None:
                continue
            valid_count += 1
            wet = (o.leaf_wetness_min or 0.0) >= 30.0
            warm = WETNESS_TEMP_LO <= o.temp_c <= WETNESS_TEMP_HI
            if wet and warm:
                wet_warm_hours += 1

        thresholds_fired: list[ThresholdHit] = []
        if wet_warm_hours >= 10:
            thresholds_fired.append(
                ThresholdHit(name="wet_warm_>=10h_high", citation_id="06-S6")
            )
        elif wet_warm_hours >= 6:
            thresholds_fired.append(
                ThresholdHit(name="wet_warm_6-9h_moderate", citation_id="06-S6")
            )
        elif wet_warm_hours >= 4:
            thresholds_fired.append(
                ThresholdHit(name="wet_warm_4-5h_low", citation_id="06-S6")
            )

        coverage = valid_count / max(1, window.hour_count)
        confidence = round(0.35 + 0.55 * coverage, 4)

        severity = secondary_infection_hours_to_severity(wet_warm_hours)

        return RiskRecordResult(
            model_id=self.SLUG,
            model_version=self.VERSION,
            block_id=window.block_id,
            valid_from=window.valid_from,
            valid_to=window.valid_to,
            pathogen=self.PATHOGEN,
            severity_1_10=severity,
            raw_score={
                "wet_warm_hours": wet_warm_hours,
                "valid_hour_coverage": round(coverage, 3),
            },
            thresholds_fired=thresholds_fired,
            input_snapshot_id=window.snapshot_id(),
            confidence=confidence,
            citation_id=self.CITATION_ID,
        )
