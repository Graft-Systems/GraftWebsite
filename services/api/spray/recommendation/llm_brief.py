"""LLM-authored daily brief generator (M1.5 PR-F.5 step 2).

Wraps the Anthropic Claude API. Returns a `{headline, paragraphs}` dict
on success; raises one of `LLMUnavailable` / `LLMTimeout` / `LLMMalformed`
on failure paths so the orchestrator can pick the right `fallback_reason`.

Spec §13B.3: the LLM produces *prose narrative* only. It must NOT
originate numbers — the verifier (verifier.py) enforces this on the
returned prose. This module is responsible for getting prose; the
caller is responsible for verifying it.

Prompt is loaded from `prompts/daily_brief_v1.md`. Bumping the prompt
version is a deliberate change that requires a plan revision (per
spec §13B.3 audit-trail rules).
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from django.conf import settings


logger = logging.getLogger(__name__)


PROMPT_PATH = Path(__file__).parent / "prompts" / "daily_brief_v1.md"
PROMPT_VERSION = "daily_brief@1.0.0"
DEFAULT_MODEL = "claude-sonnet-4-5-20251022"
DEFAULT_TIMEOUT_SEC = 10
DEFAULT_MAX_OUTPUT_TOKENS = 800


# ---------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------


class LLMError(Exception):
    """Base for LLM brief errors."""


class LLMUnavailable(LLMError):
    """API rejected the request (auth, rate-limit, 5xx, network)."""


class LLMTimeout(LLMError):
    """Request exceeded the timeout."""


class LLMMalformed(LLMError):
    """Response did not match the required JSON shape."""


# ---------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------


@dataclass
class LLMResult:
    headline: str
    paragraphs: list[str]
    model: str
    prompt_version: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


def generate(
    verdict: dict[str, Any],
    *,
    model: str | None = None,
    timeout: int | None = None,
    max_output_tokens: int | None = None,
) -> LLMResult:
    """Generate prose for one verdict. Raises on failure paths."""
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "") or ""
    if not api_key:
        raise LLMUnavailable("ANTHROPIC_API_KEY not set")

    model = model or getattr(settings, "LLM_BRIEF_MODEL", DEFAULT_MODEL)
    timeout = timeout or getattr(
        settings, "LLM_BRIEF_TIMEOUT_SEC", DEFAULT_TIMEOUT_SEC
    )
    max_output_tokens = max_output_tokens or DEFAULT_MAX_OUTPUT_TOKENS

    system_text, user_template = _load_prompt()
    user_text = _fill_template(user_template, verdict)

    try:
        from anthropic import Anthropic
    except ImportError as exc:
        raise LLMUnavailable(
            "anthropic SDK not installed; add to requirements.txt"
        ) from exc

    client = Anthropic(api_key=api_key, timeout=timeout)

    started = time.monotonic()
    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_output_tokens,
            system=system_text,
            messages=[{"role": "user", "content": user_text}],
        )
    except Exception as exc:  # noqa: BLE001
        # Anthropic SDK raises specific exceptions for timeout, rate-limit,
        # auth, etc. We map by classname to avoid hard-importing every
        # exception type (SDK versions vary).
        name = type(exc).__name__.lower()
        if "timeout" in name:
            raise LLMTimeout(str(exc)) from exc
        raise LLMUnavailable(f"{name}: {exc}") from exc
    elapsed_ms = int((time.monotonic() - started) * 1000)

    text = _extract_text(response)
    parsed = _parse_json_object(text)
    if parsed is None:
        raise LLMMalformed("response was not a parseable JSON object")

    headline = parsed.get("headline")
    paragraphs = parsed.get("paragraphs")
    if not isinstance(headline, str) or not headline.strip():
        raise LLMMalformed("missing or empty 'headline'")
    if not isinstance(paragraphs, list) or not all(
        isinstance(p, str) for p in paragraphs
    ):
        raise LLMMalformed("missing or non-string 'paragraphs'")
    if len(paragraphs) > 4:
        raise LLMMalformed(f"too many paragraphs: {len(paragraphs)}")

    return LLMResult(
        headline=headline.strip(),
        paragraphs=[p.strip() for p in paragraphs if p.strip()],
        model=model,
        prompt_version=PROMPT_VERSION,
        prompt_tokens=getattr(response.usage, "input_tokens", 0)
        if hasattr(response, "usage")
        else 0,
        completion_tokens=getattr(response.usage, "output_tokens", 0)
        if hasattr(response, "usage")
        else 0,
        latency_ms=elapsed_ms,
    )


# ---------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------


def _load_prompt() -> tuple[str, str]:
    """Split the markdown prompt into (system, user-template)."""
    text = PROMPT_PATH.read_text(encoding="utf-8")
    sys_match = re.search(
        r"## SYSTEM\s*\n(.+?)(?=\n## )", text, flags=re.DOTALL
    )
    usr_match = re.search(
        r"## USER MESSAGE TEMPLATE\s*\n(.+?)(?=\n## )", text, flags=re.DOTALL
    )
    if not sys_match or not usr_match:
        raise LLMUnavailable(
            f"prompt file at {PROMPT_PATH} is missing SYSTEM / USER sections"
        )
    sys_text = sys_match.group(1).strip()
    usr_template = usr_match.group(1).strip()

    # The template wraps the actual user message in a code fence; pull
    # only the fenced block contents.
    fence = re.search(r"```(?:\w*\n)?(.+?)```", usr_template, flags=re.DOTALL)
    if fence:
        usr_template = fence.group(1).strip()
    return sys_text, usr_template


def _fill_template(template: str, verdict: dict[str, Any]) -> str:
    verdict_json = json.dumps(verdict, indent=2, default=str)
    drivers_flat = "\n".join(_format_driver(d) for d in verdict.get("drivers") or [])
    if not drivers_flat:
        drivers_flat = "(no drivers fired this period)"
    return template.replace("{verdict_json}", verdict_json).replace(
        "{drivers_flat}", drivers_flat
    )


def _format_driver(d: dict[str, Any]) -> str:
    if not isinstance(d, dict):
        return str(d)
    model = d.get("model", "?")
    value = d.get("value")
    cid = d.get("citation_id", "")
    return f"- {model} value={value} [{cid}]"


def _extract_text(response: Any) -> str:
    """Pull text from Anthropic Messages response. Handles both shapes
    (single content block, multiple content blocks)."""
    content = getattr(response, "content", None)
    if isinstance(content, list):
        parts = []
        for block in content:
            t = getattr(block, "text", None)
            if t is None and isinstance(block, dict):
                t = block.get("text")
            if isinstance(t, str):
                parts.append(t)
        return "\n".join(parts)
    if isinstance(content, str):
        return content
    return ""


def _parse_json_object(text: str) -> dict[str, Any] | None:
    """Parse the first JSON object embedded in `text`. Returns None if no
    parseable object is present.
    """
    text = text.strip()
    if not text:
        return None
    # Fast path: whole text is JSON.
    try:
        out = json.loads(text)
        return out if isinstance(out, dict) else None
    except (TypeError, ValueError):
        pass
    # Slow path: find first balanced `{...}` block and try to parse it.
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    parsed = json.loads(candidate)
                    return parsed if isinstance(parsed, dict) else None
                except (TypeError, ValueError):
                    return None
    return None
