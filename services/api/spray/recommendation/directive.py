"""Grower-facing spray directive generation."""

from __future__ import annotations

from typing import Any


def directive_from_verdict(verdict: Any) -> dict[str, Any]:
    """Turn an audited BlockVerdict into direct operational language."""

    powdery = float(verdict.powdery_severity_1_10)
    downy = float(verdict.downy_severity_1_10)
    dominant = "powdery mildew" if powdery >= downy else "downy mildew"
    severity = max(powdery, downy)
    block_name = getattr(getattr(verdict, "block", None), "name", "this block")
    constraints = _when_not_to_spray(verdict)

    return {
        "risk_level": _risk_level(severity),
        "risk_score_1_10": round(severity, 2),
        "primary_risk": dominant,
        "when_to_spray": _when_to_spray(verdict.action, verdict.urgency),
        "what_to_spray": _what_to_spray(verdict.action, dominant, constraints),
        "where_to_spray": _where_to_spray(block_name, verdict.action),
        "when_not_to_spray": constraints,
        "confidence_note": _confidence_note(verdict),
    }


def _risk_level(severity: float) -> str:
    if severity >= 8.5:
        return "extreme"
    if severity >= 7.0:
        return "high"
    if severity >= 4.0:
        return "moderate"
    return "low"


def _when_to_spray(action: str, urgency: str) -> str:
    if action == "hold":
        return "Do not spray now; keep monitoring and rerun after the next weather update."
    if action == "scout":
        return "Scout within 72 hours; spray only if field signs or forecast trend confirm the risk."
    if urgency == "now":
        return "Spray today if label, REI/PHI, wind, rain, and temperature constraints allow."
    if urgency == "24h":
        return "Spray within 24 hours if operating conditions stay suitable."
    return "Spray in the next suitable vineyard operation window."


def _what_to_spray(action: str, dominant: str, constraints: list[str]) -> str:
    if action == "hold":
        return "No mildew material recommended from the current verdict."
    heat_limited = any(
        "heat" in item.lower() or "sulfur" in item.lower() for item in constraints
    )
    if heat_limited:
        return (
            f"Use a non-heat-sensitive {dominant} material that fits label, "
            "PHI/REI, and resistance rotation."
        )
    return (
        f"Use an effective {dominant} material selected by label, crop stage, "
        "organic/conventional program, and FRAC rotation."
    )


def _where_to_spray(block_name: str, action: str) -> list[str]:
    if action == "hold":
        return [f"Do not apply block-wide treatment in {block_name} from this verdict."]
    if action == "scout":
        return [
            f"Scout {block_name}, prioritizing shaded interiors, dense canopy, and historic mildew hotspots."
        ]
    return [
        f"Treat {block_name}.",
        "Prioritize shaded rows, dense canopy interiors, susceptible varieties, and previously infected zones.",
    ]


def _when_not_to_spray(verdict: Any) -> list[str]:
    constraints = [
        "Do not spray if wind, rain, temperature, REI/PHI, or label restrictions are outside your program limits.",
    ]
    if verdict.action == "hold":
        constraints.append(
            "Do not spray solely on this verdict while risk remains below action threshold."
        )
    if verdict.action == "scout":
        constraints.append(
            "Do not spray before scouting if the field team can verify conditions within 72 hours."
        )
    return constraints


def _confidence_note(verdict: Any) -> str:
    powdery_conf = float(verdict.powdery_confidence)
    downy_conf = float(verdict.downy_confidence)
    confidence = max(powdery_conf, downy_conf)
    if confidence >= 0.75:
        return "Model and evidence confidence are strong enough for normal operational use."
    return "Confidence is limited; verify with field scouting and source traces before spraying."
