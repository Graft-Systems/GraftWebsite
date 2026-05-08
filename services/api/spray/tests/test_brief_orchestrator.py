"""Brief orchestrator tests (M1.5 PR-F.5 step 9).

Mocks `llm_generate` at the import boundary so tests don't touch
Anthropic. Validates the decision tree: LLM disabled → fallback,
LLM ok + verifier ok → llm envelope, LLM ok + verifier fail → fallback
with the right reason, cache hit returns same envelope.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import override_settings

from spray.recommendation import orchestrator
from spray.recommendation.llm_brief import LLMResult, LLMTimeout, LLMUnavailable


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


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
    "model_versions": {},
    "generated_at": "2026-05-07T12:00:00Z",
    "audit_hash": "sha256:abcdef0123456789" + "0" * 48,
}


@override_settings(ANTHROPIC_API_KEY="", LLM_BRIEF_ENABLED=True)
def test_llm_disabled_falls_back():
    out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] == "llm_disabled"
    assert out["renderer"] == "deterministic_template@1.0.0"


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=False)
def test_llm_explicitly_disabled_falls_back():
    out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] == "llm_disabled"


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=True)
def test_llm_unavailable_falls_back():
    with patch.object(
        orchestrator,
        "_try_llm",
        wraps=orchestrator._try_llm,
    ):
        with patch(
            "spray.recommendation.llm_brief.generate",
            side_effect=LLMUnavailable("network"),
        ):
            out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] == "llm_unavailable"


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=True)
def test_llm_timeout_falls_back():
    with patch(
        "spray.recommendation.llm_brief.generate",
        side_effect=LLMTimeout("slow"),
    ):
        out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] == "llm_timeout"


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=True)
def test_llm_ok_and_verifier_ok_returns_llm_envelope():
    fake = LLMResult(
        headline="Spray within 24 hours.",
        paragraphs=[
            "Powdery at 7.2/10 with 85% confidence [GUBLER_2013].",
        ],
        model="claude-sonnet-test",
        prompt_version="daily_brief@1.0.0",
        prompt_tokens=200,
        completion_tokens=80,
        latency_ms=1234,
    )
    with patch(
        "spray.recommendation.llm_brief.generate", return_value=fake
    ):
        out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] is None
    assert out["renderer"].startswith("llm@claude-sonnet-test/")
    assert out["headline"] == "Spray within 24 hours."
    assert "_telemetry" in out
    assert out["_telemetry"]["prompt_tokens"] == 200


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=True)
def test_llm_ok_but_verifier_fails_falls_back():
    fake = LLMResult(
        headline="Spray now.",
        paragraphs=["Powdery at 9.9/10 demands action."],  # 9.9 is hallucinated
        model="claude-sonnet-test",
        prompt_version="daily_brief@1.0.0",
        prompt_tokens=100,
        completion_tokens=20,
        latency_ms=400,
    )
    with patch(
        "spray.recommendation.llm_brief.generate", return_value=fake
    ):
        out = orchestrator.render_brief(VERDICT)
    assert out["fallback_reason"] == "hallucination_guard_failed"
    assert out["renderer"] == "deterministic_template@1.0.0"


@override_settings(ANTHROPIC_API_KEY="x", LLM_BRIEF_ENABLED=True)
def test_cache_hit_returns_same_envelope():
    fake = LLMResult(
        headline="Spray within 24 hours.",
        paragraphs=["Powdery at 7.2/10 [GUBLER_2013]."],
        model="claude-sonnet-test",
        prompt_version="daily_brief@1.0.0",
        prompt_tokens=100,
        completion_tokens=20,
        latency_ms=400,
    )
    with patch(
        "spray.recommendation.llm_brief.generate", return_value=fake
    ) as mock_gen:
        first = orchestrator.render_brief(VERDICT)
        second = orchestrator.render_brief(VERDICT)
    # Second call hit cache; LLM only invoked once.
    assert mock_gen.call_count == 1
    assert first["headline"] == second["headline"]
