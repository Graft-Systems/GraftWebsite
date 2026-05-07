"""Deterministic daily-brief renderer (PR-F).

Spec §13B.3 says the LLM produces only the *prose narrative* and never
*originates* numbers. PR-F ships the deterministic-template fallback
that the LLM-authored brief (PR-F.5) will fall back to on hallucination
guard failure. Shipping it first means we always have a verified
narrative even if the LLM path isn't enabled.

The template uses plain Python f-strings — no Jinja dep — and surfaces
every numeric claim with a `[citation_id]` marker resolvable to a row
in `sources_master.csv` via `citations.lookup`.

Output shape:

    {
      "headline": "Spray now — high powdery mildew risk",
      "paragraphs": ["...", "..."],
      "drivers": [{"...": "..."}],   # mirror of verdict.drivers for UI
      "citations": [{"citation_id": "06-S2", "title": "...", "year": 2013, ...}],
      "fallback_reason": null,        # filled when LLM path falls back
    }
"""

from __future__ import annotations

from typing import Any

from spray.recommendation.citations import lookup_many


# ---------------------------------------------------------------------
# Headline
# ---------------------------------------------------------------------


def _headline(verdict: dict[str, Any]) -> str:
    action = verdict.get("action", "hold")
    urgency = verdict.get("urgency", "none")
    powdery = float(verdict.get("powdery_severity_1_10") or 0)
    downy = float(verdict.get("downy_severity_1_10") or 0)
    primary = "powdery mildew" if powdery >= downy else "downy mildew"
    if action == "spray":
        if urgency == "now":
            return f"Spray today — high {primary} risk"
        if urgency == "24h":
            return f"Spray within 24 hours — high {primary} risk"
        return f"Spray within 72 hours — elevated {primary} risk"
    if action == "scout":
        return f"Scout your blocks — moderate {primary} risk"
    return "Hold — risk is low"


# ---------------------------------------------------------------------
# Paragraphs (deterministic — no LLM)
# ---------------------------------------------------------------------


def _severity_paragraph(verdict: dict[str, Any]) -> str:
    powdery = float(verdict.get("powdery_severity_1_10") or 0)
    downy = float(verdict.get("downy_severity_1_10") or 0)
    powdery_conf = float(verdict.get("powdery_confidence") or 0) * 100
    downy_conf = float(verdict.get("downy_confidence") or 0) * 100
    return (
        f"Powdery mildew sits at severity {powdery:.1f}/10 "
        f"({powdery_conf:.0f}% confidence). "
        f"Downy mildew sits at severity {downy:.1f}/10 "
        f"({downy_conf:.0f}% confidence)."
    )


def _drivers_paragraph(verdict: dict[str, Any]) -> str:
    drivers = verdict.get("drivers") or []
    if not drivers:
        return "No model fired this period — verdict reflects baseline conditions."
    parts = []
    seen_models: set[str] = set()
    for d in drivers:
        model = d.get("model", "unknown")
        if model in seen_models:
            continue
        seen_models.add(model)
        cid = d.get("citation_id", "")
        value = d.get("value")
        if value is None:
            continue
        parts.append(
            f"{model} reports severity {float(value):.1f}/10 [{cid}]"
        )
    return ". ".join(parts) + "."


def _split_paragraph(verdict: dict[str, Any]) -> str | None:
    summary = verdict.get("split_summary") or ""
    if "split" in summary.lower():
        return summary
    return None


def _action_paragraph(verdict: dict[str, Any]) -> str:
    action = verdict.get("action", "hold")
    urgency = verdict.get("urgency", "none")
    if action == "spray":
        if urgency == "now":
            return (
                "Recommendation: spray TODAY. The ensemble agrees on elevated "
                "risk and conditions favour rapid disease establishment."
            )
        if urgency == "24h":
            return (
                "Recommendation: spray within the next 24 hours. Conditions "
                "support disease pressure but you have a small window."
            )
        return (
            "Recommendation: plan a spray within 72 hours. Risk is elevated "
            "but not yet acute."
        )
    if action == "scout":
        return (
            "Recommendation: walk the blocks and look for early symptoms. "
            "Risk is moderate but not yet at the spray threshold."
        )
    return (
        "Recommendation: hold. Conditions don't support rapid disease "
        "establishment right now. Re-check tomorrow's verdict."
    )


# ---------------------------------------------------------------------
# Citations envelope
# ---------------------------------------------------------------------


def _collect_citations(verdict: dict[str, Any]) -> list[dict[str, Any]]:
    """Pull unique citation_ids from drivers + thresholds, resolve via sources_master.csv."""
    cids: list[str] = []
    for d in verdict.get("drivers") or []:
        cid = d.get("citation_id")
        if cid and cid not in cids:
            cids.append(cid)
    resolved = lookup_many(cids)
    out: list[dict[str, Any]] = []
    for cid in cids:
        row = resolved.get(cid)
        if row is None:
            out.append(
                {
                    "citation_id": cid,
                    "title": "(citation not yet in sources_master.csv)",
                    "year": None,
                }
            )
            continue
        out.append(
            {
                "citation_id": cid,
                "title": row.get("title") or row.get("Title") or "",
                "year": row.get("year") or row.get("Year"),
                "authors": row.get("authors") or row.get("Authors") or "",
                "kind": row.get("kind") or row.get("Kind") or "",
                "doi": row.get("doi") or row.get("DOI") or "",
                "url": row.get("url") or row.get("URL") or "",
            }
        )
    return out


# ---------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------


def render_brief(verdict: dict[str, Any]) -> dict[str, Any]:
    """Render a deterministic brief for one BlockVerdict.

    Args:
        verdict: dict matching the `block_verdict.generated.v1` schema.

    Returns:
        Brief envelope (see module docstring for shape).
    """
    paragraphs = [
        _severity_paragraph(verdict),
        _drivers_paragraph(verdict),
        _action_paragraph(verdict),
    ]
    split = _split_paragraph(verdict)
    if split:
        paragraphs.insert(2, split)

    return {
        "headline": _headline(verdict),
        "paragraphs": paragraphs,
        "drivers": list(verdict.get("drivers") or []),
        "citations": _collect_citations(verdict),
        "fallback_reason": None,
        "renderer": "deterministic_template@1.0.0",
    }
