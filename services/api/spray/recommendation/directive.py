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
    program = _program_settings(verdict)

    return {
        "risk_level": _risk_level(severity),
        "risk_score_1_10": round(severity, 2),
        "primary_risk": dominant,
        "when_to_spray": _when_to_spray(verdict),
        "what_to_spray": _what_to_spray(
            verdict.action,
            dominant,
            constraints,
            program,
        ),
        "where_to_spray": _where_to_spray(block_name, verdict.action),
        "when_not_to_spray": constraints,
        "confidence_note": _confidence_note(verdict),
        "spray_window": _spray_window(verdict),
    }


def _risk_level(severity: float) -> str:
    if severity >= 8.5:
        return "extreme"
    if severity >= 7.0:
        return "high"
    if severity >= 4.0:
        return "moderate"
    return "low"


def _when_to_spray(verdict: Any) -> str:
    window = _spray_window(verdict)
    if verdict.action == "hold":
        if window["status"] == "blocked":
            return "Do not spray today; no safe spray window is visible in the current forecast."
        return "Hold today; keep monitoring and rerun after the next weather update."
    if verdict.action == "scout":
        return "Scout within 72 hours; spray only if field signs or forecast trend confirm the risk."
    if window["status"] == "open":
        return f"Spray in the next suitable window: {window['label']}."
    if verdict.urgency == "now":
        return "Spray today if label, REI/PHI, wind, rain, and temperature constraints allow."
    if verdict.urgency == "24h":
        return "Spray within 24 hours if operating conditions stay suitable."
    return "Spray in the next suitable vineyard operation window."


def _what_to_spray(
    action: str,
    dominant: str,
    constraints: list[str],
    program: dict[str, Any],
) -> str:
    if action == "hold":
        return "No mildew material recommended from the current verdict."
    program_type = str(program.get("program_type") or "your").replace("_", " ")
    products = str(program.get("allowed_products") or "").strip()
    product_note = (
        f" Choose from your allowed products: {products}."
        if products
        else ""
    )
    heat_limited = any(
        "heat" in item.lower() or "sulfur" in item.lower() for item in constraints
    )
    if heat_limited:
        return (
            f"Use a non-heat-sensitive {dominant} material that fits your "
            f"{program_type} program, label, PHI/REI, and resistance rotation."
            f"{product_note}"
        )
    return (
        f"Use an effective {dominant} material selected by label, crop stage, "
        f"{program_type} program, and FRAC rotation.{product_note}"
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
    program = _program_settings(verdict)
    constraints = [
        (
            "Do not spray if wind, rain, temperature, REI/PHI, or label "
            "restrictions are outside your program limits."
        ),
    ]
    constraints.append(
        "Program limits: wind <= "
        f"{program.get('max_wind_mph', 10)} mph, temperature "
        f"{program.get('min_temp_f', 45)}-{program.get('max_temp_f', 85)} F, "
        f"avoid rain for {program.get('avoid_rain_hours', 12)} hours after application."
    )
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


def _program_settings(verdict: Any) -> dict[str, Any]:
    org = getattr(getattr(getattr(verdict, "block", None), "vineyard", None), "org", None)
    if org is None:
        return {}
    return (getattr(org, "settings", {}) or {}).get("spray_program") or {}


def _spray_window(verdict: Any) -> dict[str, str]:
    forecast = getattr(verdict, "forecast_7d", None) or []
    if verdict.action == "hold":
        return {
            "status": "hold",
            "label": "No treatment window recommended from this verdict.",
        }
    if not forecast:
        return {
            "status": "unknown",
            "label": "No forecast window available yet.",
        }

    for day in forecast[:3]:
        action = str(day.get("action") or "").lower()
        if action in {"spray", "scout"}:
            return {
                "status": "open",
                "label": f"{day.get('date', 'upcoming day')} for {action}",
            }
    return {
        "status": "blocked",
        "label": "No safe spray window in the next 72 hours.",
    }
