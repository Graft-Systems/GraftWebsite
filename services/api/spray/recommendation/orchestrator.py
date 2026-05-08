"""Daily-brief orchestrator (M1.5 PR-F.5 step 3).

Picks the LLM-authored path when available + verified, falls back to
the deterministic-template renderer when the LLM is disabled, fails,
or produces output that fails the P-Cite verifier.

Public entry point: `render_brief(verdict)`. Same envelope shape as
PR-F's deterministic renderer; the `renderer` and `fallback_reason`
fields tell the UI which path was used.

Caching: keyed on `audit_hash`, 1-hour TTL. The audit hash is
deterministic over the verdict's inputs, so any verdict change
invalidates the cache automatically. Cache is the same Django cache
backend the rest of the app uses (Redis in prod, locmem in tests).
"""

from __future__ import annotations

import logging
import time
from typing import Any

from django.conf import settings
from django.core.cache import cache


logger = logging.getLogger(__name__)


CACHE_TTL_SEC = 3600  # 1 hour


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


def render_brief(verdict: dict[str, Any]) -> dict[str, Any]:
    """Pick LLM-or-fallback and return a brief envelope.

    Always returns a populated envelope. Never raises — failures route
    to the deterministic fallback with an explanatory `fallback_reason`.
    """
    from spray.recommendation.daily_brief import render_deterministic_brief

    if not _llm_enabled():
        return render_deterministic_brief(verdict, fallback_reason="llm_disabled")

    audit_hash = verdict.get("audit_hash") or ""
    cache_key = f"brief:{audit_hash}" if audit_hash else None
    if cache_key:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    envelope = _try_llm(verdict)
    if envelope.get("renderer", "").startswith("llm@") and cache_key:
        cache.set(cache_key, envelope, CACHE_TTL_SEC)
    return envelope


# ---------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------


def _llm_enabled() -> bool:
    """LLM path is enabled when a key is set AND not explicitly disabled."""
    if not getattr(settings, "ANTHROPIC_API_KEY", "") or "":
        # The `or ""` collapses None to "" so the empty-string check works.
        pass
    if not getattr(settings, "LLM_BRIEF_ENABLED", True):
        return False
    return bool(getattr(settings, "ANTHROPIC_API_KEY", "") or "")


def _try_llm(verdict: dict[str, Any]) -> dict[str, Any]:
    """Run the LLM + verifier; return either the LLM envelope or the
    deterministic fallback with a populated `fallback_reason`."""
    from spray.recommendation.daily_brief import render_deterministic_brief
    from spray.recommendation.llm_brief import (
        LLMMalformed,
        LLMTimeout,
        LLMUnavailable,
        generate as llm_generate,
    )
    from spray.recommendation.verifier import verify

    started = time.monotonic()
    try:
        result = llm_generate(verdict)
    except LLMTimeout as exc:
        logger.warning("LLM brief timeout: %s", exc)
        return render_deterministic_brief(verdict, fallback_reason="llm_timeout")
    except LLMUnavailable as exc:
        logger.warning("LLM brief unavailable: %s", exc)
        return render_deterministic_brief(verdict, fallback_reason="llm_unavailable")
    except LLMMalformed as exc:
        logger.warning("LLM brief malformed response: %s", exc)
        return render_deterministic_brief(
            verdict, fallback_reason="schema_mismatch"
        )

    prose_envelope = {"headline": result.headline, "paragraphs": result.paragraphs}
    verify_result = verify(prose_envelope, verdict)
    if not verify_result.ok:
        logger.info(
            "LLM brief failed verifier: reason=%s unverified=%s unknown_citations=%s",
            verify_result.reason,
            verify_result.unverified_atoms,
            verify_result.unknown_citations,
        )
        return render_deterministic_brief(
            verdict, fallback_reason=verify_result.reason or "hallucination_guard_failed"
        )

    # LLM path succeeded. Build the envelope; preserve drivers + citations
    # from the deterministic renderer's pipeline (the LLM only writes prose).
    base = render_deterministic_brief(verdict, fallback_reason=None)
    base["headline"] = result.headline
    base["paragraphs"] = result.paragraphs
    base["fallback_reason"] = None
    base["renderer"] = f"llm@{result.model}/{result.prompt_version}"
    base["_telemetry"] = {
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
        "latency_ms": result.latency_ms,
        "model": result.model,
        "prompt_version": result.prompt_version,
    }
    return base
