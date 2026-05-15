"""Grower-facing spray directive generation."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any


def _forecast_7d_is_placeholder_stub(forecast: list[Any]) -> bool:
    """Detect ensemble Year-0 flat-line forecast (see ``equal_weight_soft_vote``).

    Those rows satisfy the JSON schema but carry no wind/temp/rain; using
    them for spray-window logic falsely suggests real operating windows.
    """
    if len(forecast) != 7:
        return False
    for day in forecast:
        if not isinstance(day, dict):
            return False
        if day.get("powdery_severity_1_10") != 1.0:
            return False
        if day.get("downy_severity_1_10") != 1.0:
            return False
        if str(day.get("action", "")).lower() != "hold":
            return False
    return True


def directive_from_verdict(verdict: Any) -> dict[str, Any]:
    """Turn an audited BlockVerdict into direct operational language."""

    powdery = float(verdict.powdery_severity_1_10)
    downy = float(verdict.downy_severity_1_10)
    dominant = "powdery mildew" if powdery >= downy else "downy mildew"
    severity = max(powdery, downy)
    block_name = getattr(getattr(verdict, "block", None), "name", "this block")
    forecast = getattr(verdict, "forecast_7d", None) or []
    window = _spray_window(verdict)
    constraints = _when_not_to_spray(verdict, window)
    program = _program_settings(verdict)

    return {
        "risk_level": _risk_level(severity),
        "risk_score_1_10": round(severity, 2),
        "primary_risk": dominant,
        "when_to_spray": _when_to_spray(verdict, window),
        "what_to_spray": _what_to_spray(
            verdict.action,
            dominant,
            constraints,
            program,
        ),
        "where_to_spray": _where_to_spray(block_name, verdict.action),
        "when_not_to_spray": constraints,
        "confidence_note": _confidence_note(verdict, forecast),
        "spray_window": window,
    }


def _risk_level(severity: float) -> str:
    if severity >= 8.5:
        return "extreme"
    if severity >= 7.0:
        return "high"
    if severity >= 4.0:
        return "moderate"
    return "low"


def _when_to_spray(verdict: Any, window: dict[str, Any]) -> str:
    if verdict.action == "hold":
        return "Do not spray now; hold today and keep monitoring after the next weather update."
    if verdict.action == "scout":
        if window["status"] == "blocked":
            return f"Scout within 72 hours; do not spray until conditions open. {window['label']}."
        return "Scout within 72 hours; spray only if field signs or forecast trend confirm the risk."
    if window["status"] == "open":
        return f"Spray in the next suitable window: {window['label']}."
    if window["status"] == "blocked":
        next_window = window.get("next_safe_window")
        if next_window:
            return f"Do not spray today; next likely safe window is {next_window}."
        return "Do not spray today; no safe spray window is visible in the current forecast."
    if window["status"] == "unknown":
        return "Spray timing is uncertain until forecast and data freshness are confirmed."
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


def _when_not_to_spray(verdict: Any, window: dict[str, Any]) -> list[str]:
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
    for reason in window.get("blocked_reasons", []):
        constraints.append(f"Do not spray: {reason}.")
    return constraints


def _confidence_note(verdict: Any, forecast: list[Any]) -> str:
    powdery_conf = float(verdict.powdery_confidence)
    downy_conf = float(verdict.downy_confidence)
    confidence = max(powdery_conf, downy_conf)
    stub_tail = ""
    if _forecast_7d_is_placeholder_stub(forecast):
        stub_tail = (
            " The 7-day spray timing outlook is not connected yet (placeholder only)."
        )
    if confidence >= 0.75:
        return (
            "Model and evidence confidence are strong enough for normal operational use."
            + stub_tail
        )
    return (
        "Confidence is limited; verify with field scouting and source traces before spraying."
        + stub_tail
    )


def _program_settings(verdict: Any) -> dict[str, Any]:
    org = getattr(getattr(getattr(verdict, "block", None), "vineyard", None), "org", None)
    if org is None:
        return {}
    return (getattr(org, "settings", {}) or {}).get("spray_program") or {}


def _spray_window(verdict: Any) -> dict[str, Any]:
    forecast = getattr(verdict, "forecast_7d", None) or []
    if verdict.action == "hold":
        return {
            "status": "hold",
            "label": "No treatment window recommended from this verdict.",
            "reason": "risk remains below action threshold",
            "blocked_reasons": [],
        }
    if _forecast_7d_is_placeholder_stub(forecast):
        return {
            "status": "unknown",
            "label": (
                "Spray-window timing is not available until a real 7-day forecast "
                "is connected to this block."
            ),
            "reason": "forecast_placeholder",
            "blocked_reasons": [
                "The verdict’s 7-day outlook is a schema placeholder (flat hold), "
                "not forecast weather—do not use it to pick spray dates."
            ],
        }
    if not forecast:
        return {
            "status": "unknown",
            "label": "No forecast window available yet.",
            "reason": "forecast missing",
            "blocked_reasons": ["forecast is missing"],
        }

    if _data_is_stale(verdict):
        return {
            "status": "unknown",
            "label": "Refresh the directive before choosing a spray window.",
            "reason": "directive data is stale",
            "blocked_reasons": ["directive data is stale"],
        }

    evaluated = [_evaluate_forecast_day(day, _program_settings(verdict)) for day in forecast[:7]]
    candidate_days = evaluated[:3] or evaluated
    for day in candidate_days:
        action = str(day["action"]).lower()
        if action in {"spray", "scout"} and not day["blocked_reasons"]:
            return {
                "status": "open",
                "date": day.get("date"),
                "label": _open_label(day, action),
                "reason": f"{action} risk with operating constraints in range",
                "blocked_reasons": [],
            }
    next_safe = next(
        (
            _format_window_day(day.get("date"))
            for day in evaluated[3:]
            if str(day["action"]).lower() in {"spray", "scout"}
            and not day["blocked_reasons"]
        ),
        None,
    )
    blocked_reasons = _unique(
        reason for day in candidate_days for reason in day["blocked_reasons"]
    )
    return {
        "status": "blocked",
        "label": "No safe spray window in the next 72 hours.",
        "reason": "operating constraints block near-term spray timing",
        "blocked_reasons": blocked_reasons or ["forecast does not show a sprayable risk window"],
        "next_safe_window": next_safe,
    }


def _evaluate_forecast_day(day: dict[str, Any], program: dict[str, Any]) -> dict[str, Any]:
    blocked: list[str] = []
    wind = _wind_mph(day)
    temp = _temp_f(day)
    rain = _rain_mm(day)
    max_wind = _num(program.get("max_wind_mph"), 10)
    min_temp = _num(program.get("min_temp_f"), 45)
    max_temp = _num(program.get("max_temp_f"), 85)

    if wind is not None and wind > max_wind:
        blocked.append(f"wind is {wind:.0f} mph, above the {max_wind:.0f} mph limit")
    if temp is not None and temp < min_temp:
        blocked.append(f"temperature is {temp:.0f} F, below the {min_temp:.0f} F limit")
    if temp is not None and temp > max_temp:
        blocked.append(f"temperature is {temp:.0f} F, above the {max_temp:.0f} F limit")
    if rain is not None and rain > 0:
        hours = _num(program.get("avoid_rain_hours"), 12)
        blocked.append(f"rain is forecast inside the {hours:.0f}-hour no-rain window")

    return {**day, "blocked_reasons": blocked}


def _wind_mph(day: dict[str, Any]) -> float | None:
    if day.get("wind_mph") is not None:
        return _num(day.get("wind_mph"), 0)
    if day.get("wind_speed_mph") is not None:
        return _num(day.get("wind_speed_mph"), 0)
    if day.get("wind_speed_ms") is not None:
        return _num(day.get("wind_speed_ms"), 0) * 2.23694
    return None


def _temp_f(day: dict[str, Any]) -> float | None:
    for key in ("temp_f", "max_temp_f", "temperature_f"):
        if day.get(key) is not None:
            return _num(day.get(key), 0)
    for key in ("temp_c", "max_temp_c", "temperature_c"):
        if day.get(key) is not None:
            return _num(day.get(key), 0) * 9 / 5 + 32
    return None


def _rain_mm(day: dict[str, Any]) -> float | None:
    for key in ("precip_mm", "rain_mm", "rain_next_24h_mm"):
        if day.get(key) is not None:
            return _num(day.get(key), 0)
    return None


def _data_is_stale(verdict: Any) -> bool:
    generated_at = getattr(verdict, "generated_at", None)
    if generated_at is None:
        return False
    if isinstance(generated_at, str):
        try:
            generated_at = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        except ValueError:
            return False
    if not isinstance(generated_at, datetime):
        return False
    now = datetime.now(tz=generated_at.tzinfo) if generated_at.tzinfo else datetime.now()
    return generated_at < now - timedelta(hours=36)


def _open_label(day: dict[str, Any], action: str) -> str:
    when = _format_window_day(day.get("date"))
    return f"{when} for {action}"


def _format_window_day(value: Any) -> str:
    if not value:
        return "an upcoming day"
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _num(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _unique(items: Any) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out
