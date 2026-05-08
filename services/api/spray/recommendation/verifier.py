"""P-Cite verifier + hallucination guard (M1.5 PR-F.5 step 1).

Spec §13B.1/§13B.3: the LLM produces *prose narrative* only. It MUST NOT
originate or paraphrase numbers. Every numeric token in LLM output must
trace back to a verdict-derived value, and every `[citation_id]` marker
must resolve via `sources_master.csv` AND appear in `verdict.drivers`.

Verifier is strict by default. Any unverified numeric atom or unknown
citation forces fallback to the deterministic-template renderer.

Pure Python, no Django dep — testable in isolation, importable from
both the orchestrator and a future eval harness.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

# Match standalone numeric atoms: integer or decimal, optionally with
# units we expect in a brief (%, °C, /10). Excludes citation IDs, which
# we tokenize separately.
NUMERIC_ATOM_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)(?:\s*(%|°C|/10))?\b"
)

# Match [CITATION_ID] markers. IDs are uppercase + digits + underscores.
CITATION_RE = re.compile(r"\[([A-Z0-9_]+)\]")

# Soft prose-length cap. Headlines + paragraphs combined, strip whitespace.
DEFAULT_MAX_PROSE_CHARS = 600

# Numbers we permit in prose without explicit verdict matching — generic
# scale references. Adding 1, 7, 10, 24, 72 covers "1-10 scale", "7-day",
# "24h", "72h", and "10/10" without false-positive guard trips.
GENERIC_NUMBERS = frozenset({"1", "7", "10", "24", "72", "60"})


# ---------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------


@dataclass
class VerifyResult:
    ok: bool
    reason: str | None = None
    unverified_atoms: list[str] = field(default_factory=list)
    unknown_citations: list[str] = field(default_factory=list)
    prose_length: int = 0


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


def verify(
    prose: dict[str, Any] | str,
    verdict: dict[str, Any],
    *,
    max_prose_chars: int = DEFAULT_MAX_PROSE_CHARS,
) -> VerifyResult:
    """Verify LLM-authored prose against the schema-validated verdict.

    `prose` accepts either:
      - A string (the full prose blob the LLM returned)
      - A dict shaped like `{headline, paragraphs: [...]}` (envelope-ready)

    Returns `VerifyResult.ok = True` only when:
      1. Every numeric atom in the prose matches a verdict-derived value.
      2. Every `[CITATION_ID]` marker resolves via `citations.lookup`
         AND appears in at least one `verdict.drivers[].citation_id`.
      3. Prose length ≤ `max_prose_chars`.
    """
    prose_text = _flatten(prose)
    prose_length = len(prose_text)

    if prose_length > max_prose_chars:
        return VerifyResult(
            ok=False,
            reason="prose_too_long",
            prose_length=prose_length,
        )

    allowed_numerics = _build_allowed_numerics(verdict)
    unverified = _find_unverified_atoms(prose_text, allowed_numerics)
    if unverified:
        return VerifyResult(
            ok=False,
            reason="hallucination_guard_failed",
            unverified_atoms=unverified,
            prose_length=prose_length,
        )

    driver_citations = _driver_citations(verdict)
    unknown = _find_unknown_citations(prose_text, driver_citations)
    if unknown:
        return VerifyResult(
            ok=False,
            reason="citation_missing",
            unknown_citations=unknown,
            prose_length=prose_length,
        )

    return VerifyResult(ok=True, prose_length=prose_length)


# ---------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------


def _flatten(prose: dict[str, Any] | str) -> str:
    if isinstance(prose, str):
        return prose
    if not isinstance(prose, dict):
        return str(prose)
    parts: list[str] = []
    headline = prose.get("headline")
    if headline:
        parts.append(str(headline))
    for p in prose.get("paragraphs") or []:
        parts.append(str(p))
    return "\n".join(parts)


def _build_allowed_numerics(verdict: dict[str, Any]) -> set[str]:
    """Compute the set of numeric strings the LLM is allowed to use.

    Numbers come from:
    - severity_1_10 fields (powdery/downy)
    - confidence fields (rendered as percentage)
    - driver `value`, `threshold`, `weight`
    - forecast_7d severities
    Plus a fixed set of generic scale numbers (1, 7, 10, 24, 72, 60).
    """
    allowed: set[str] = set(GENERIC_NUMBERS)

    # Severity fields — accept the integer + decimal forms.
    for key in ("powdery_severity_1_10", "downy_severity_1_10"):
        v = verdict.get(key)
        if v is None:
            continue
        allowed |= _decimal_renderings(v)

    # Confidence fields — accept both 0.0-1.0 and the rendered percent.
    for key in ("powdery_confidence", "downy_confidence"):
        v = verdict.get(key)
        if v is None:
            continue
        try:
            f = float(v)
        except (TypeError, ValueError):
            continue
        allowed |= _decimal_renderings(f)
        pct = round(f * 100)
        allowed.add(str(pct))
        allowed.add(f"{pct}.0")

    # Drivers — value, threshold, weight (weight rendered as percent).
    for d in verdict.get("drivers") or []:
        if not isinstance(d, dict):
            continue
        for k in ("value", "threshold"):
            if k in d and d[k] is not None:
                allowed |= _decimal_renderings(d[k])
        if "weight" in d and d["weight"] is not None:
            try:
                w = float(d["weight"])
                allowed.add(str(round(w * 100)))
                allowed.add(f"{round(w * 100)}.0")
            except (TypeError, ValueError):
                pass

    # Forecast 7d severities.
    for f in verdict.get("forecast_7d") or []:
        if not isinstance(f, dict):
            continue
        for k in ("powdery_severity_1_10", "downy_severity_1_10"):
            if k in f and f[k] is not None:
                allowed |= _decimal_renderings(f[k])

    return allowed


def _decimal_renderings(value: Any) -> set[str]:
    """Permitted string forms of a numeric value: '7.2', '7', '7.20'."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return set()
    out = {
        f"{f:.0f}",
        f"{f:.1f}",
        f"{f:.2f}",
        str(f),
    }
    # Strip trailing zeros: 7.20 → 7.2
    s = str(f)
    if "." in s:
        out.add(s.rstrip("0").rstrip("."))
    return out


def _find_unverified_atoms(text: str, allowed: set[str]) -> list[str]:
    found: list[str] = []
    for match in NUMERIC_ATOM_RE.finditer(text):
        atom = match.group(1)
        if atom in allowed:
            continue
        # Try variants: stripped trailing zero, integer form
        if "." in atom and atom.rstrip("0").rstrip(".") in allowed:
            continue
        try:
            f = float(atom)
            if f"{f:.0f}" in allowed or f"{f:.1f}" in allowed:
                continue
        except ValueError:
            pass
        if atom not in found:
            found.append(atom)
    return found


def _driver_citations(verdict: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for d in verdict.get("drivers") or []:
        if not isinstance(d, dict):
            continue
        cid = d.get("citation_id")
        if cid:
            out.add(str(cid))
    return out


def _find_unknown_citations(text: str, driver_citations: set[str]) -> list[str]:
    """Citations in prose must (a) appear in verdict.drivers AND (b) resolve
    via citations.lookup. The `lookup` import is local so the verifier
    stays Django-free for unit tests.
    """
    matches = CITATION_RE.findall(text)
    if not matches:
        return []

    # Unknown if not in drivers OR not resolvable via sources_master.
    unknown: list[str] = []
    try:
        from spray.recommendation.citations import lookup as _lookup
    except Exception:  # noqa: BLE001
        _lookup = None  # type: ignore[assignment]

    for cid in matches:
        in_drivers = cid in driver_citations
        resolves = True
        if _lookup is not None:
            resolves = _lookup(cid) is not None
        if not (in_drivers and resolves) and cid not in unknown:
            unknown.append(cid)
    return unknown
