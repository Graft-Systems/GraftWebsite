"""Grower-facing directive tests."""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace

from spray.recommendation.directive import directive_from_verdict


def test_directive_makes_spray_decision_explicit():
    verdict = SimpleNamespace(
        block=SimpleNamespace(name="North Block"),
        powdery_severity_1_10=8.4,
        downy_severity_1_10=2.1,
        powdery_confidence=0.82,
        downy_confidence=0.61,
        action="spray",
        urgency="24h",
        forecast_7d=[
            {
                "date": (date.today() + timedelta(days=1)).isoformat(),
                "action": "spray",
                "wind_mph": 6,
                "temp_f": 72,
                "precip_mm": 0,
            }
        ],
    )

    directive = directive_from_verdict(verdict)

    assert directive["risk_level"] == "high"
    assert directive["primary_risk"] == "powdery mildew"
    assert "next suitable window" in directive["when_to_spray"]
    assert "powdery mildew" in directive["what_to_spray"]
    assert any("North Block" in item for item in directive["where_to_spray"])
    assert directive["when_not_to_spray"]
    assert directive["spray_window"]["status"] == "open"


def test_directive_holds_when_risk_is_low():
    verdict = SimpleNamespace(
        block=SimpleNamespace(name="South Block"),
        powdery_severity_1_10=2.0,
        downy_severity_1_10=1.5,
        powdery_confidence=0.7,
        downy_confidence=0.7,
        action="hold",
        urgency="none",
        forecast_7d=[],
    )

    directive = directive_from_verdict(verdict)

    assert directive["risk_level"] == "low"
    assert directive["when_to_spray"].startswith("Do not spray now")
    assert directive["what_to_spray"].startswith("No mildew material")


def test_directive_blocks_spray_window_when_program_limits_are_exceeded():
    org = SimpleNamespace(
        settings={
            "spray_program": {
                "max_wind_mph": 8,
                "min_temp_f": 45,
                "max_temp_f": 85,
                "avoid_rain_hours": 12,
            }
        }
    )
    vineyard = SimpleNamespace(org=org)
    block = SimpleNamespace(name="West Block", vineyard=vineyard)
    verdict = SimpleNamespace(
        block=block,
        powdery_severity_1_10=8.0,
        downy_severity_1_10=3.0,
        powdery_confidence=0.8,
        downy_confidence=0.7,
        action="spray",
        urgency="now",
        forecast_7d=[
            {
                "date": (date.today() + timedelta(days=1)).isoformat(),
                "action": "spray",
                "wind_mph": 14,
                "temp_f": 70,
                "precip_mm": 0,
            }
        ],
    )

    directive = directive_from_verdict(verdict)

    assert directive["spray_window"]["status"] == "blocked"
    assert "wind is 14 mph" in directive["spray_window"]["blocked_reasons"][0]
    assert directive["when_to_spray"].startswith("Do not spray today")


def test_directive_reports_next_safe_window_after_blocked_near_term_days():
    org = SimpleNamespace(
        settings={
            "spray_program": {
                "max_wind_mph": 8,
                "min_temp_f": 45,
                "max_temp_f": 85,
                "avoid_rain_hours": 12,
            }
        }
    )
    vineyard = SimpleNamespace(org=org)
    block = SimpleNamespace(name="West Block", vineyard=vineyard)
    safe_date = (date.today() + timedelta(days=4)).isoformat()
    verdict = SimpleNamespace(
        block=block,
        powdery_severity_1_10=8.0,
        downy_severity_1_10=3.0,
        powdery_confidence=0.8,
        downy_confidence=0.7,
        action="spray",
        urgency="now",
        forecast_7d=[
            {
                "date": (date.today() + timedelta(days=1)).isoformat(),
                "action": "spray",
                "wind_mph": 14,
                "temp_f": 70,
                "precip_mm": 0,
            },
            {
                "date": (date.today() + timedelta(days=2)).isoformat(),
                "action": "spray",
                "wind_mph": 12,
                "temp_f": 70,
                "precip_mm": 0,
            },
            {
                "date": (date.today() + timedelta(days=3)).isoformat(),
                "action": "spray",
                "wind_mph": 10,
                "temp_f": 70,
                "precip_mm": 0,
            },
            {
                "date": safe_date,
                "action": "spray",
                "wind_mph": 4,
                "temp_f": 70,
                "precip_mm": 0,
            },
        ],
    )

    directive = directive_from_verdict(verdict)

    assert directive["spray_window"]["status"] == "blocked"
    assert directive["spray_window"]["next_safe_window"] == safe_date


def test_directive_treats_ensemble_flat_forecast_as_placeholder():
    """Year-0 ensemble stub (1/1/hold ×7) must not imply real spray windows."""
    verdict = SimpleNamespace(
        block=SimpleNamespace(name="North Block"),
        powdery_severity_1_10=8.0,
        downy_severity_1_10=2.0,
        powdery_confidence=0.9,
        downy_confidence=0.7,
        action="spray",
        urgency="24h",
        forecast_7d=[
            {
                "date": (date.today() + timedelta(days=i)).isoformat(),
                "powdery_severity_1_10": 1.0,
                "downy_severity_1_10": 1.0,
                "action": "hold",
            }
            for i in range(1, 8)
        ],
    )

    directive = directive_from_verdict(verdict)

    assert directive["spray_window"]["status"] == "unknown"
    assert directive["spray_window"]["reason"] == "forecast_placeholder"
    assert "placeholder" in directive["confidence_note"].lower()
    assert directive["when_to_spray"].startswith("Spray timing is uncertain")
