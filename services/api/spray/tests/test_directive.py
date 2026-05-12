"""Grower-facing directive tests."""

from __future__ import annotations

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
    )

    directive = directive_from_verdict(verdict)

    assert directive["risk_level"] == "high"
    assert directive["primary_risk"] == "powdery mildew"
    assert "24 hours" in directive["when_to_spray"]
    assert "powdery mildew" in directive["what_to_spray"]
    assert any("North Block" in item for item in directive["where_to_spray"])
    assert directive["when_not_to_spray"]


def test_directive_holds_when_risk_is_low():
    verdict = SimpleNamespace(
        block=SimpleNamespace(name="South Block"),
        powdery_severity_1_10=2.0,
        downy_severity_1_10=1.5,
        powdery_confidence=0.7,
        downy_confidence=0.7,
        action="hold",
        urgency="none",
    )

    directive = directive_from_verdict(verdict)

    assert directive["risk_level"] == "low"
    assert directive["when_to_spray"].startswith("Do not spray now")
    assert directive["what_to_spray"].startswith("No mildew material")
