"""Tests for the deterministic daily-brief renderer (M1.5 PR-F).

The brief is what the LLM-authored path (PR-F.5) falls back to when the
hallucination guard trips. These tests lock the schema-validated numbers
appearing verbatim and citation_id markers being preserved.
"""

from __future__ import annotations

from spray.recommendation.daily_brief import render_brief


BASE_VERDICT = {
    "id": "v-1",
    "block": "b-1",
    "date": "2026-05-07",
    "powdery_severity_1_10": "7.20",
    "downy_severity_1_10": "3.10",
    "powdery_confidence": "0.85",
    "downy_confidence": "0.55",
    "action": "spray",
    "urgency": "24h",
    "drivers": [
        {
            "model": "gubler_thomas_2013",
            "value": 7.2,
            "threshold": 6.0,
            "citation_id": "GUBLER_2013",
            "weight": 0.5,
        },
    ],
    "split_summary": "Powdery elevated; downy quiet.",
    "forecast_7d": [],
    "advisory_events": [],
    "model_versions": {"gubler_thomas": "1.0.0"},
    "generated_at": "2026-05-07T12:00:00Z",
    "audit_hash": (
        "sha256:abcdef0123456789abcdef0123456789"
        "abcdef0123456789abcdef0123456789"
    ),
}


def test_render_brief_happy_path_spray_24h():
    out = render_brief(BASE_VERDICT)
    assert out["headline"] == "Spray within 24 hours — high powdery mildew risk"
    assert out["renderer"] == "deterministic_template@1.0.0"
    assert out["fallback_reason"] is None
    # Severity paragraph surfaces schema numbers verbatim.
    severity_p = out["paragraphs"][0]
    assert "7.2/10" in severity_p
    assert "3.1/10" in severity_p
    assert "85% confidence" in severity_p
    # Drivers paragraph includes citation marker.
    assert "[GUBLER_2013]" in out["paragraphs"][1]
    # Action paragraph reflects 24h urgency.
    action_p = out["paragraphs"][-1]
    assert "24 hours" in action_p


def test_render_brief_hold_fallback():
    verdict = {
        **BASE_VERDICT,
        "action": "hold",
        "urgency": "none",
        "drivers": [],
        "powdery_severity_1_10": "1.50",
        "downy_severity_1_10": "1.20",
    }
    out = render_brief(verdict)
    assert out["headline"] == "Hold — risk is low"
    # No drivers → baseline language.
    assert "No model fired" in out["paragraphs"][1]
    assert out["citations"] == []


def test_render_brief_scout_action():
    verdict = {**BASE_VERDICT, "action": "scout", "urgency": "72h"}
    out = render_brief(verdict)
    assert "Scout" in out["headline"]
    assert "walk the blocks" in out["paragraphs"][-1].lower()


def test_render_brief_split_summary_inserted():
    verdict = {
        **BASE_VERDICT,
        "split_summary": "Models split: powdery hot, downy cold.",
    }
    out = render_brief(verdict)
    # Split paragraph slotted before the action paragraph.
    joined = " ".join(out["paragraphs"])
    assert "Models split" in joined
    assert out["paragraphs"][-1].startswith("Recommendation:")


def test_render_brief_drivers_mirrored_for_ui():
    out = render_brief(BASE_VERDICT)
    assert out["drivers"] == BASE_VERDICT["drivers"]
