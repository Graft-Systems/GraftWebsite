"""Ensemble fusion — Year-0 equal-weight soft vote (spec §11A.2, §11A.3).

Inputs: a list of `RiskRecordResult` objects covering one block over
one valid window.

Outputs: a verdict dict matching `block_verdict.generated.v1.json`.

Year-0 algorithm (this file):
- Average severity within each pathogen across runners that fired.
- Confidence = 1.0 - σ(severities) on a normalized scale; clipped to [0, 1].
- Action thresholding:
    severity ≥ 7 → spray (urgency 24h or now)
    4 ≤ severity < 7 → scout (urgency 72h)
    severity < 4 → hold (urgency none)
- `split_summary` is a one-line plain-English description of agreement.

Year-1+ algorithms (deferred):
- Weighted average tuned on labelled outcomes (Brier-score minimization)
- Stacked meta-learner with conformal prediction intervals on severity

Both later variants will be exposed as separate functions here so
individual call sites can opt in by name. The audit_hash format
distinguishes them via the `ensemble_version` constant in `audit.py`.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

from spray.aggregation.audit import ENSEMBLE_VERSION, compute_audit_hash
from spray.aggregation.runners.base import RiskRecordResult


# ---------------------------------------------------------------------
# Action thresholds — spec §11A.2 + §13B.1
# ---------------------------------------------------------------------

ACTION_SPRAY_THRESHOLD = 7.0
ACTION_SCOUT_THRESHOLD = 4.0


def _action_for(severity: float) -> str:
    if severity >= ACTION_SPRAY_THRESHOLD:
        return "spray"
    if severity >= ACTION_SCOUT_THRESHOLD:
        return "scout"
    return "hold"


def _urgency_for(severity: float) -> str:
    if severity >= 8.5:
        return "now"
    if severity >= ACTION_SPRAY_THRESHOLD:
        return "24h"
    if severity >= ACTION_SCOUT_THRESHOLD:
        return "72h"
    return "none"


def _stddev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))


def _split_summary(
    powdery_records: list[RiskRecordResult],
    downy_records: list[RiskRecordResult],
) -> str:
    parts: list[str] = []
    if powdery_records:
        sevs = [r.severity_1_10 for r in powdery_records]
        sigma = _stddev(sevs)
        agreement = "high" if sigma < 1.0 else "moderate" if sigma < 2.0 else "split"
        parts.append(
            f"{len(powdery_records)} powdery model(s) agree ({agreement}, σ={sigma:.2f})"
        )
    if downy_records:
        sevs = [r.severity_1_10 for r in downy_records]
        sigma = _stddev(sevs)
        if sigma < 1.0:
            parts.append(
                f"{len(downy_records)} downy model(s) agree (high, σ={sigma:.2f})"
            )
        else:
            range_str = f"{min(sevs):.1f}–{max(sevs):.1f}"
            parts.append(
                f"downy models split ({range_str}, σ={sigma:.2f})"
            )
    if not parts:
        return "no model output for this block"
    return ". ".join(parts) + "."


def _drivers(
    records: Iterable[RiskRecordResult], weight_per_record: float
) -> list[dict[str, Any]]:
    drivers: list[dict[str, Any]] = []
    for r in records:
        # Pick the loudest threshold for this driver row; if none, skip.
        thresholds = list(r.thresholds_fired)
        if not thresholds:
            # Still record the driver but with neutral threshold info.
            drivers.append(
                {
                    "model": r.model_id,
                    "value": float(r.severity_1_10),
                    "threshold": 0.0,
                    "citation_id": r.citation_id,
                    "weight": round(weight_per_record, 4),
                }
            )
            continue
        for t in thresholds:
            drivers.append(
                {
                    "model": r.model_id,
                    "value": float(r.severity_1_10),
                    "threshold": 0.0,
                    "citation_id": t.citation_id,
                    "weight": round(weight_per_record, 4),
                }
            )
    return drivers


def _placeholder_forecast_7d(start_date: date) -> list[dict[str, Any]]:
    """Year-0 forecast stub.

    A real 7-day forecast requires forecast weather data running through
    each runner per future day. PR-G (Sentinel-2) and the forecast
    variants of `WeatherWindow` are queued for that. For now we emit a
    deterministic flat-line forecast so the schema's strict 7-entry
    constraint is satisfied; the UI surfaces it with a "preview"
    badge until live forecast data lands.
    """
    return [
        {
            "date": (start_date + timedelta(days=offset)).isoformat(),
            "powdery_severity_1_10": 1.0,
            "downy_severity_1_10": 1.0,
            "action": "hold",
        }
        for offset in range(1, 8)
    ]


def equal_weight_soft_vote(
    *,
    block_id: str,
    target_date: date,
    risk_records: list[RiskRecordResult],
    advisory_event_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Year-0 equal-weight soft vote.

    Returns a dict matching `block_verdict.generated.v1.json` exactly.
    Caller passes the day-of records; this function does not query the
    DB or call other services.
    """
    advisory_event_ids = advisory_event_ids or []
    powdery = [r for r in risk_records if r.pathogen == "powdery"]
    downy = [r for r in risk_records if r.pathogen == "downy"]

    powdery_sev = (
        sum(r.severity_1_10 for r in powdery) / len(powdery) if powdery else 1.0
    )
    downy_sev = (
        sum(r.severity_1_10 for r in downy) / len(downy) if downy else 1.0
    )

    powdery_conf = (
        sum(r.confidence for r in powdery) / len(powdery) if powdery else 0.0
    )
    downy_conf = (
        sum(r.confidence for r in downy) / len(downy) if downy else 0.0
    )

    # Reduce confidence proportional to spread.
    powdery_conf *= max(0.5, 1.0 - _stddev([r.severity_1_10 for r in powdery]) / 5.0)
    downy_conf *= max(0.5, 1.0 - _stddev([r.severity_1_10 for r in downy]) / 5.0)

    overall_severity = max(powdery_sev, downy_sev)
    action = _action_for(overall_severity)
    urgency = _urgency_for(overall_severity)

    # Equal weight across whichever records actually fired for this verdict.
    total = len(risk_records) or 1
    weight = 1.0 / total

    drivers = _drivers(risk_records, weight)

    # input_snapshot_id should be identical across runners for the same
    # window; pick first record's, or empty if no records.
    input_snapshot_id = (
        risk_records[0].input_snapshot_id if risk_records else "sha256:" + ("0" * 64)
    )
    model_versions = {r.model_id: r.model_version for r in risk_records}
    audit_hash = compute_audit_hash(
        input_snapshot_id=input_snapshot_id, model_versions=model_versions
    )

    return {
        "block_id": str(block_id),
        "date": target_date.isoformat(),
        "powdery_severity_1_10": round(float(powdery_sev), 2),
        "downy_severity_1_10": round(float(downy_sev), 2),
        "powdery_confidence": round(float(powdery_conf), 4),
        "downy_confidence": round(float(downy_conf), 4),
        "action": action,
        "urgency": urgency,
        "drivers": drivers,
        "split_summary": _split_summary(powdery, downy),
        "forecast_7d": _placeholder_forecast_7d(target_date),
        "advisory_events": advisory_event_ids,
        "model_versions": model_versions,
        "generated_at": datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z"),
        "audit_hash": audit_hash,
    }
