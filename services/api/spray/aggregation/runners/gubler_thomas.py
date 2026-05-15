"""Gubler–Thomas conidial PMI runner (reads persisted daily PMI).

The mechanistic conidial schedule (3×6h trigger, daily +20/−10, heat proxy)
is computed in ``spray.aggregation.pmi.gubler_thomas_conidial`` and stored
per calendar day in ``BlockPowderyMildewIndex``. This runner maps the
latest stored PMI to severity for the ensemble (spray / scout / hold).
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from spray.aggregation.pmi.gubler_thomas_conidial import pmi_risk_tier
from spray.aggregation.runners.base import (
    ModelRunner,
    RiskRecordResult,
    ThresholdHit,
    WeatherWindow,
)
from spray.aggregation.runners.registry import register_runner
from spray.models import BlockPowderyMildewIndex


def _utc_target_date(valid_to: datetime) -> date:
    if valid_to.tzinfo is None:
        valid_to = valid_to.replace(tzinfo=timezone.utc)
    return valid_to.astimezone(timezone.utc).date()


def pmi_to_severity_1_10(pmi: int) -> float:
    """Map discrete PMI bands to 1–10 for equal-weight ensemble thresholds."""
    if pmi <= 30:
        if pmi <= 0:
            return 2.0
        return 2.0 + (pmi / 30.0) * 1.5
    if pmi < 70:
        if pmi < 31:
            return 4.0
        return 4.0 + ((pmi - 31) / 38.0) * 2.0
    return min(10.0, 7.0 + (pmi - 70) / 30.0 * 3.0)


@register_runner
class GublerThomasRunner:
    SLUG = "gubler_thomas_2013"
    VERSION = "2.0.0"
    PATHOGEN = "powdery"
    CITATION_ID = "06-S2"

    def compute(self, window: WeatherWindow) -> RiskRecordResult:
        target_date = _utc_target_date(window.valid_to)
        row = (
            BlockPowderyMildewIndex.objects.unscoped()
            .filter(block_id=window.block_id, date__lte=target_date)
            .order_by("-date")
            .first()
        )

        if row is None:
            severity = 2.0
            pmi = 0
            tier = "low"
            phase = "inactive"
            index_date = target_date
            confidence = 0.35
            thresholds_fired: list[ThresholdHit] = [
                ThresholdHit(name="pmi_missing_default_low", citation_id=self.CITATION_ID)
            ]
            explain = (
                "No powdery mildew index (PMI) rollup yet for this block — "
                "run `python manage.py rollup_pmi` or wait for the daily worker."
            )
        else:
            pmi = int(row.pmi)
            tier = row.risk_tier
            phase = row.phase
            index_date = row.date
            severity = pmi_to_severity_1_10(pmi)
            hours = (row.details or {}).get("data_sources_summary", {}).get(
                "hours_with_temperature"
            )
            if isinstance(hours, int) and hours > 0:
                confidence = round(min(0.95, 0.45 + 0.02 * min(hours, 24)), 4)
            else:
                confidence = round(0.50 + 0.10 * (window.hour_count / 24.0), 4)
            thresholds_fired = []
            if pmi >= 70:
                thresholds_fired.append(
                    ThresholdHit(name="pmi_high>=70", citation_id=self.CITATION_ID)
                )
            elif pmi >= 40:
                thresholds_fired.append(
                    ThresholdHit(name="pmi_moderate>=40", citation_id=self.CITATION_ID)
                )
            rules = row.details.get("rule_lines") if isinstance(row.details, dict) else []
            first_rule = rules[0] if isinstance(rules, list) and rules else "see PMI history"
            explain = (
                f"Powdery mildew index {pmi} ({pmi_risk_tier(pmi)}) on {index_date.isoformat()}: "
                f"{first_rule}; directive severity {severity:.1f}/10."
            )

        return RiskRecordResult(
            model_id=self.SLUG,
            model_version=self.VERSION,
            block_id=window.block_id,
            valid_from=window.valid_from,
            valid_to=window.valid_to,
            pathogen=self.PATHOGEN,
            severity_1_10=round(severity, 2),
            raw_score={
                "pmi": pmi,
                "pmi_risk_tier": tier,
                "pmi_phase": phase,
                "pmi_index_date": index_date.isoformat(),
                "provenance_ref": {
                    "block_id": str(window.block_id),
                    "index_date": index_date.isoformat(),
                },
                "pmi_explain_sentence": explain,
            },
            thresholds_fired=thresholds_fired,
            input_snapshot_id=window.snapshot_id(),
            confidence=confidence,
            citation_id=self.CITATION_ID,
        )
