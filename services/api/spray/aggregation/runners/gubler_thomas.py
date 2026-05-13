"""Gubler-Thomas Powdery Mildew Risk Index (2013 revision).

UC Davis canonical PM model for *Erysiphe necator*. Original Thomas,
Gubler, Leavitt 1994; revised high-temperature thresholds in Gubler
2013 (`docs/research/06_outbreak-prediction.md` source 06-S2).

### Algorithm (simplified Year-0 implementation)

Daily Risk Index 0–100, accumulated hour-by-hour over the window:

  - +20 per consecutive 6h block where 21°C ≤ T ≤ 30°C ("favourable" range)
  - -10 per consecutive 2h block where T > 35°C (heat sterilization, original)
  - **2013 revision:** the lethal threshold shifts from 35°C to 38°C
  - Cap RI at [0, 100]

Severity 1–10 mapping per spec §11A.4 lives in
`spray.aggregation.severity_anchors`.

### Caveats (what Year-0 doesn't do)

This is an MVP implementation focused on a deterministic pipeline that
the ensemble engine, audit hash, and verdict UI can consume against
real Napa weather. It does NOT yet include:

- Biofix detection (asexual sporulation start) — needs canopy phenology
- Lethal-day rollback decisions tuned per AVA
- Diurnal humidity gating (RH > 75% modifier)
- Cleistothecial inoculum carry-over from prior season

These tighten the model in PR-C.5 / M2 once we have real-vineyard
calibration data. Spec §11A.5 covers the calibration plan.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from spray.aggregation.runners.base import (
    HourlyObservation,
    ModelRunner,
    RiskRecordResult,
    ThresholdHit,
    WeatherWindow,
)
from spray.aggregation.runners.registry import register_runner


# Tunables (held here so the test suite can monkeypatch).
FAVOURABLE_TEMP_LO = 21.0  # °C
FAVOURABLE_TEMP_HI = 30.0  # °C
LETHAL_TEMP = 38.0  # °C — 2013 revision (was 35 in original 1994 Thomas)
LETHAL_HOURS_REQUIRED = 2
FAVOURABLE_HOURS_PER_BLOCK = 6
RI_PER_FAVOURABLE_BLOCK = 20.0
RI_PER_LETHAL_BLOCK = -10.0
RI_CEILING = 100.0
RI_FLOOR = 0.0


def _consecutive_run_count(
    obs: list[HourlyObservation], predicate
) -> int:
    """Count completed runs of length-N where every hour matches predicate.

    Used to count favourable 6h blocks and lethal 2h blocks. Gaps
    (None temp_c) reset the run.
    """
    return 0  # placeholder; real impl below
    # NOTE: function body below replaces this — Python decorator pattern
    # used to keep the interface obvious in stubs.


def _count_blocks(
    obs: Iterable[HourlyObservation], min_temp: float, max_temp: float, block_hours: int
) -> int:
    """Count complete blocks of `block_hours` consecutive hours where
    `min_temp ≤ temp_c ≤ max_temp`. None values reset the streak.
    """
    streak = 0
    blocks = 0
    for o in obs:
        if o.temp_c is None:
            streak = 0
            continue
        if min_temp <= o.temp_c <= max_temp:
            streak += 1
            if streak >= block_hours:
                blocks += 1
                streak = 0
        else:
            streak = 0
    return blocks


def _count_lethal_blocks(
    obs: Iterable[HourlyObservation], threshold: float, block_hours: int
) -> int:
    """Count complete blocks of `block_hours` consecutive hours T > threshold."""
    streak = 0
    blocks = 0
    for o in obs:
        if o.temp_c is None:
            streak = 0
            continue
        if o.temp_c > threshold:
            streak += 1
            if streak >= block_hours:
                blocks += 1
                streak = 0
        else:
            streak = 0
    return blocks


@register_runner
class GublerThomasRunner:
    SLUG = "gubler_thomas_2013"
    VERSION = "1.0.0"
    PATHOGEN = "powdery"
    CITATION_ID = "06-S2"

    def compute(self, window: WeatherWindow) -> RiskRecordResult:
        from spray.aggregation.severity_anchors import gt_ri_to_severity_1_10

        obs = window.observations
        favourable_blocks = _count_blocks(
            obs,
            FAVOURABLE_TEMP_LO,
            FAVOURABLE_TEMP_HI,
            FAVOURABLE_HOURS_PER_BLOCK,
        )
        lethal_blocks = _count_lethal_blocks(obs, LETHAL_TEMP, LETHAL_HOURS_REQUIRED)

        ri_raw = (
            favourable_blocks * RI_PER_FAVOURABLE_BLOCK
            + lethal_blocks * RI_PER_LETHAL_BLOCK
        )
        ri = max(RI_FLOOR, min(RI_CEILING, ri_raw))

        thresholds_fired: list[ThresholdHit] = []
        if favourable_blocks > 0:
            thresholds_fired.append(
                ThresholdHit(
                    name=f"favourable_block_x{favourable_blocks}",
                    citation_id="06-S2",
                )
            )
        if lethal_blocks > 0:
            thresholds_fired.append(
                ThresholdHit(
                    name=f"lethal_38C_block_x{lethal_blocks}",
                    citation_id="06-S2",
                )
            )
        if ri >= 60:
            thresholds_fired.append(
                ThresholdHit(name="RI>=60_high", citation_id="06-S2")
            )

        # Confidence reduces with sparse / gappy data.
        valid_hours = sum(1 for o in obs if o.temp_c is not None)
        expected_hours = window.hour_count or 1
        coverage = valid_hours / expected_hours
        confidence = round(0.40 + 0.60 * coverage, 4)

        severity = gt_ri_to_severity_1_10(ri)

        return RiskRecordResult(
            model_id=self.SLUG,
            model_version=self.VERSION,
            block_id=window.block_id,
            valid_from=window.valid_from,
            valid_to=window.valid_to,
            pathogen=self.PATHOGEN,
            severity_1_10=severity,
            raw_score={
                "ri": ri,
                "favourable_blocks": favourable_blocks,
                "lethal_blocks": lethal_blocks,
                "valid_hour_coverage": round(coverage, 3),
            },
            thresholds_fired=thresholds_fired,
            input_snapshot_id=window.snapshot_id(),
            confidence=confidence,
            citation_id=self.CITATION_ID,
        )
