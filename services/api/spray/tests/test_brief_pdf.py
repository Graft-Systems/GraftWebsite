"""Audit PDF render tests (M1.5 PR-F.5 step 9).

Avoids importing reportlab unless installed. The pure-Python renderer
should produce a PDF byte-string that starts with %PDF and is non-trivial.
"""

from __future__ import annotations

import importlib.util

import pytest


HAS_REPORTLAB = importlib.util.find_spec("reportlab") is not None


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
        }
    ],
    "split_summary": "",
    "forecast_7d": [],
    "advisory_events": [],
    "model_versions": {"gubler_thomas": "1.0.0"},
    "generated_at": "2026-05-07T12:00:00Z",
    "audit_hash": "sha256:" + "a" * 64,
}

BRIEF = {
    "headline": "Spray within 24 hours.",
    "paragraphs": [
        "Powdery mildew sits at 7.2/10 with 85% confidence.",
        "Gubler-Thomas reports 7.2 above the 6.0 threshold [GUBLER_2013].",
    ],
    "drivers": VERDICT["drivers"],
    "citations": [
        {
            "citation_id": "GUBLER_2013",
            "title": "UC Davis Powdery Mildew Risk Index 2013 revision",
            "year": 2013,
            "authors": "Gubler, W. D., Rademacher, M. R., Vasquez, S. J.",
        }
    ],
    "fallback_reason": None,
    "renderer": "deterministic_template@1.0.0",
}


@pytest.mark.skipif(not HAS_REPORTLAB, reason="reportlab not installed")
def test_render_audit_pdf_returns_pdf_bytes():
    from spray.recommendation.pdf_audit import render_audit_pdf

    out = render_audit_pdf(verdict=VERDICT, brief=BRIEF, block_label="V · B")
    assert isinstance(out, bytes)
    assert out.startswith(b"%PDF"), "output is not a PDF"
    # Non-trivial size (a single-page PDF with our content is at least ~1.5KB).
    assert len(out) > 1500


@pytest.mark.skipif(not HAS_REPORTLAB, reason="reportlab not installed")
def test_render_handles_no_drivers():
    from spray.recommendation.pdf_audit import render_audit_pdf

    verdict_no_drivers = {**VERDICT, "drivers": []}
    brief_no_drivers = {**BRIEF, "drivers": [], "citations": []}
    out = render_audit_pdf(
        verdict=verdict_no_drivers, brief=brief_no_drivers, block_label=""
    )
    assert out.startswith(b"%PDF")


@pytest.mark.skipif(not HAS_REPORTLAB, reason="reportlab not installed")
def test_render_escapes_special_chars():
    """`<`, `>`, `&` in any field should not break the platypus parser."""
    from spray.recommendation.pdf_audit import render_audit_pdf

    rough_brief = {
        **BRIEF,
        "headline": "Spray <today> & soon",
        "paragraphs": ["Powdery > 7 means 7.2/10 with 85% confidence."],
    }
    out = render_audit_pdf(
        verdict=VERDICT, brief=rough_brief, block_label="A & B <test>"
    )
    assert out.startswith(b"%PDF")
