"""P-Cite verifier + hallucination guard tests (M1.5 PR-F.5 step 9)."""

from __future__ import annotations

from spray.recommendation.verifier import verify


VERDICT = {
    "id": "v-1",
    "block": "b-1",
    "date": "2026-05-07",
    "powdery_severity_1_10": 7.2,
    "downy_severity_1_10": 3.1,
    "powdery_confidence": 0.85,
    "downy_confidence": 0.55,
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
}


def test_happy_path_all_numbers_valid():
    prose = {
        "headline": "Spray within 24 hours.",
        "paragraphs": [
            "Powdery mildew sits at 7.2/10 with 85% confidence.",
            "Gubler-Thomas reports value 7.2 above the 6.0 threshold [GUBLER_2013].",
        ],
    }
    result = verify(prose, VERDICT)
    assert result.ok, f"failed: {result.reason} unverified={result.unverified_atoms}"


def test_hallucinated_number_fails():
    prose = {
        "headline": "Spray now.",
        "paragraphs": [
            # 9.9 doesn't appear anywhere in the verdict — should fail.
            "Powdery mildew at 9.9/10 demands action.",
        ],
    }
    result = verify(prose, VERDICT)
    assert not result.ok
    assert result.reason == "hallucination_guard_failed"
    assert "9.9" in result.unverified_atoms


def test_unknown_citation_fails():
    prose = {
        "headline": "Spray.",
        "paragraphs": [
            "Powdery at 7.2/10 [BOGUS_CITATION].",
        ],
    }
    result = verify(prose, VERDICT)
    assert not result.ok
    assert result.reason == "citation_missing"
    assert "BOGUS_CITATION" in result.unknown_citations


def test_prose_too_long_fails():
    prose = {
        "headline": "x",
        "paragraphs": ["7.2/10. " * 200],
    }
    result = verify(prose, VERDICT)
    assert not result.ok
    assert result.reason == "prose_too_long"


def test_generic_scale_numbers_allowed():
    """Numbers like 1, 7, 10, 24, 72 are scale references, not data."""
    prose = {
        "headline": "Severity 7.2 on a 1 to 10 scale; spray within 24 hours.",
        "paragraphs": [
            "Forecast is on a 7-day window.",
        ],
    }
    result = verify(prose, VERDICT)
    assert result.ok, f"failed: unverified={result.unverified_atoms}"


def test_confidence_as_percentage_accepted():
    """0.85 confidence rendered as '85%' is allowed."""
    prose = {
        "headline": "Spray.",
        "paragraphs": ["Powdery at 7.2/10, 85% confidence."],
    }
    result = verify(prose, VERDICT)
    assert result.ok


def test_empty_prose_passes_trivially():
    prose = {"headline": "", "paragraphs": []}
    result = verify(prose, VERDICT)
    assert result.ok
    assert result.prose_length == 0


def test_string_input_supported():
    prose = "Spray within 24 hours [GUBLER_2013]. Powdery at 7.2/10."
    result = verify(prose, VERDICT)
    assert result.ok
