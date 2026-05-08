"""PDF audit-log composer (M1.5 PR-F.5 step 5).

reportlab platypus → tamper-evident PDF showing the verdict, the brief
(LLM or fallback), the full driver list with citations, and the audit
hash. Suitable for grower record-keeping + compliance (CDPR PUR etc.).

Generated on demand at every download — no caching, no S3 storage. The
audit-trail value comes from regeneration matching the verdict's
`audit_hash`; caching would create stale-PDF risk.

Pure rendering. The endpoint is responsible for fetching the verdict +
brief envelope and passing them in.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone as dt_tz
from typing import Any


def render_audit_pdf(
    *,
    verdict: dict[str, Any],
    brief: dict[str, Any],
    block_label: str = "",
) -> bytes:
    """Render a PDF byte-string for the verdict + brief.

    Args:
        verdict: dict matching `block_verdict.generated.v1` schema.
        brief: envelope from `orchestrator.render_brief`.
        block_label: optional human-friendly "Vineyard · Block" string.

    Returns:
        PDF bytes ready to write to an HttpResponse.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.6 * inch,
        title=f"Graft Spray verdict {verdict.get('id', '')}",
        author="Graft Spray",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        spaceAfter=4,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=colors.HexColor("#666666"),
        leading=14,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    small = ParagraphStyle(
        "small",
        parent=body,
        fontSize=8,
        textColor=colors.HexColor("#999999"),
        leading=10,
    )
    mono = ParagraphStyle(
        "mono",
        parent=body,
        fontName="Courier",
        fontSize=8,
        textColor=colors.HexColor("#444444"),
    )

    story: list[Any] = []

    # ----- Header -----
    title = brief.get("headline") or "Graft Spray verdict"
    story.append(Paragraph(_safe(title), h1))
    label_line_parts = []
    if block_label:
        label_line_parts.append(_safe(block_label))
    if verdict.get("date"):
        label_line_parts.append(_safe(str(verdict["date"])))
    if label_line_parts:
        story.append(Paragraph(" · ".join(label_line_parts), h2))
    story.append(Spacer(1, 8))

    # ----- Verdict summary table -----
    action = verdict.get("action") or "?"
    urgency = verdict.get("urgency") or "?"
    powdery = _fmt_decimal(verdict.get("powdery_severity_1_10"))
    downy = _fmt_decimal(verdict.get("downy_severity_1_10"))
    pconf = _fmt_pct(verdict.get("powdery_confidence"))
    dconf = _fmt_pct(verdict.get("downy_confidence"))
    summary_data = [
        ["Action", action.upper()],
        ["Urgency", urgency],
        ["Powdery severity", f"{powdery}/10  ({pconf} confidence)"],
        ["Downy severity", f"{downy}/10  ({dconf} confidence)"],
    ]
    summary_tbl = Table(summary_data, colWidths=[1.6 * inch, 4.0 * inch])
    summary_tbl.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 10),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#333333")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, colors.HexColor("#dddddd")),
            ]
        )
    )
    story.append(summary_tbl)
    story.append(Spacer(1, 14))

    # ----- Brief paragraphs -----
    story.append(Paragraph("Brief", h2))
    for para in brief.get("paragraphs") or []:
        story.append(Paragraph(_safe(str(para)), body))
    if brief.get("split_summary"):
        story.append(Paragraph(_safe(str(brief["split_summary"])), body))
    story.append(Spacer(1, 10))

    # ----- Drivers table -----
    story.append(Paragraph("Drivers", h2))
    drivers = verdict.get("drivers") or []
    if drivers:
        rows = [["Model", "Value", "Threshold", "Weight", "Citation"]]
        for d in drivers:
            if not isinstance(d, dict):
                continue
            weight = d.get("weight")
            try:
                wpct = f"{round(float(weight) * 100)}%" if weight is not None else ""
            except (TypeError, ValueError):
                wpct = ""
            rows.append(
                [
                    _safe(str(d.get("model", ""))),
                    _safe(_fmt_decimal(d.get("value"))),
                    _safe(_fmt_decimal(d.get("threshold"))),
                    wpct,
                    f"[{_safe(str(d.get('citation_id', '')))}]",
                ]
            )
        drivers_tbl = Table(
            rows,
            colWidths=[2.0 * inch, 0.9 * inch, 1.0 * inch, 0.7 * inch, 1.4 * inch],
            repeatRows=1,
        )
        drivers_tbl.setStyle(
            TableStyle(
                [
                    ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
                    ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#999999")),
                    (
                        "LINEBELOW",
                        (0, 1),
                        (-1, -1),
                        0.25,
                        colors.HexColor("#dddddd"),
                    ),
                ]
            )
        )
        story.append(drivers_tbl)
    else:
        story.append(
            Paragraph(
                "No model fired this period — verdict reflects baseline.",
                body,
            )
        )
    story.append(Spacer(1, 14))

    # ----- Citations -----
    citations = brief.get("citations") or []
    if citations:
        story.append(Paragraph("Citations", h2))
        for c in citations:
            if not isinstance(c, dict):
                continue
            cid = c.get("citation_id", "")
            title_str = c.get("title", "") or ""
            year = c.get("year") or ""
            authors = c.get("authors", "") or ""
            line = f"[{cid}] {authors} ({year}) — {title_str}"
            story.append(Paragraph(_safe(line), body))
        story.append(Spacer(1, 10))

    # ----- Audit footer -----
    story.append(Paragraph("Audit trail", h2))
    audit_hash = verdict.get("audit_hash") or ""
    renderer = brief.get("renderer") or ""
    fallback_reason = brief.get("fallback_reason")
    generated_at = (
        datetime.now(tz=dt_tz.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    )
    audit_block = [
        f"Audit hash: {audit_hash}",
        f"Renderer: {renderer}",
        f"Fallback reason: {fallback_reason or 'none'}",
        f"PDF generated: {generated_at}",
        f"Model versions: {verdict.get('model_versions') or {}}",
    ]
    for line in audit_block:
        story.append(Paragraph(_safe(line), mono))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "This PDF is regenerated on demand. Re-fetch any time to verify "
            "the audit hash above against the live verdict.",
            small,
        )
    )

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _safe(text: str) -> str:
    """Escape `<`, `>`, `&` for reportlab paragraph parser."""
    if text is None:
        return ""
    s = str(text)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _fmt_decimal(value: Any) -> str:
    if value is None:
        return ""
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return str(value)


def _fmt_pct(value: Any) -> str:
    if value is None:
        return ""
    try:
        return f"{round(float(value) * 100)}%"
    except (TypeError, ValueError):
        return str(value)
