#!/usr/bin/env python
"""Export a Claude Code session JSONL transcript to a clean Markdown file.

Filters out:
- System reminders / system notifications
- Tool calls + tool results (keeps a one-line note that a tool ran)
- Empty messages

Keeps:
- User text messages
- Assistant text messages

Run: python scripts/export_chat_to_md.py <session-jsonl> <output.md>
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path


SYSTEM_PATTERNS = [
    re.compile(r"^<system-reminder>", re.DOTALL),
    re.compile(r"^<task-notification>", re.DOTALL),
    re.compile(r"\[SYSTEM NOTIFICATION", re.DOTALL),
    re.compile(r"^Caveat: The messages below were generated"),
    re.compile(r"^This session is being continued", re.DOTALL),
]


def is_system_message(text: str) -> bool:
    if not text:
        return True
    text = text.strip()
    if not text:
        return True
    for pat in SYSTEM_PATTERNS:
        if pat.match(text):
            return True
    return False


def strip_system_reminders(text: str) -> str:
    """Remove inline <system-reminder> blocks but keep surrounding user prose."""
    cleaned = re.sub(
        r"<system-reminder>.*?</system-reminder>",
        "",
        text,
        flags=re.DOTALL,
    )
    return cleaned.strip()


def format_timestamp(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return iso


def extract_text_blocks(content) -> str:
    """Walk a message content (str or list of blocks) and join text only."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for block in content:
        if not isinstance(block, dict):
            continue
        btype = block.get("type")
        if btype == "text":
            parts.append(block.get("text", ""))
        elif btype == "tool_use":
            name = block.get("name", "tool")
            parts.append(f"_[ran tool: {name}]_")
        # tool_result, image, etc. — skipped
    return "\n\n".join(p for p in parts if p)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: export_chat_to_md.py <session.jsonl> <output.md>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    if not src.exists():
        print(f"source not found: {src}", file=sys.stderr)
        return 1

    out_lines: list[str] = []
    out_lines.append("# Graft Spray Build Session — Claude Code Transcript")
    out_lines.append("")
    out_lines.append(f"_Exported {datetime.now().strftime('%Y-%m-%d %H:%M')} from {src.name}_")
    out_lines.append("")
    out_lines.append("---")
    out_lines.append("")

    last_role: str | None = None
    msg_count = 0

    with src.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Records can be top-level messages or wrapped envelopes.
            msg = rec.get("message", rec)
            role = msg.get("role")
            if role not in ("user", "assistant"):
                continue

            content = msg.get("content")
            text = extract_text_blocks(content)
            if not text:
                continue

            # Inline system reminders inside user text → strip.
            text = strip_system_reminders(text)
            if is_system_message(text):
                continue

            ts_raw = rec.get("timestamp") or msg.get("timestamp", "")
            ts = format_timestamp(ts_raw) if ts_raw else ""

            heading = "## Benson" if role == "user" else "## Claude"
            if ts:
                heading += f"  _({ts})_"

            # Collapse consecutive same-role messages with a blank line.
            if role != last_role:
                out_lines.append(heading)
                out_lines.append("")
            out_lines.append(text)
            out_lines.append("")
            last_role = role
            msg_count += 1

    dst.write_text("\n".join(out_lines), encoding="utf-8")
    print(f"wrote {msg_count} messages to {dst} ({dst.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
