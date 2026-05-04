#!/usr/bin/env python
"""CI guard: every emit_event(category=...) site has a registered schema.

Greps the codebase for `category="<group>.<event>"` patterns inside calls to
`emit_event` (and the legacy `_emit_lake_event`), then confirms each
distinct category resolves to a schema file under
`services/api/spray/schemas/events/<group>/<event>/v1.json`.

Exit codes:
  0 = all categories registered
  1 = one or more categories are missing schema files
  2 = nothing to check (no emit sites found)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_ROOT = REPO_ROOT / "services" / "api" / "spray" / "schemas" / "events"
SOURCE_ROOT = REPO_ROOT / "services" / "api" / "spray"

# `emit_event(category="vineyard.created", ...)` and
# `_emit_lake_event(..., category="...", ...)` are the two patterns we
# emit through. The registry call itself is on a single line in both.
CATEGORY_RE = re.compile(
    r"""(?:emit_event|_emit_lake_event)\s*\([^)]*category\s*=\s*["']([^"']+)["']""",
    re.MULTILINE,
)


def find_emit_categories() -> set[str]:
    found: set[str] = set()
    for py in SOURCE_ROOT.rglob("*.py"):
        # Skip the helper definitions themselves.
        if py.name in ("lake.py", "registry.py"):
            continue
        text = py.read_text(encoding="utf-8")
        for match in CATEGORY_RE.finditer(text):
            found.add(match.group(1))
    return found


def schema_exists(category: str) -> bool:
    if "." not in category:
        return False
    group, _, event_type = category.partition(".")
    schema_path = SCHEMA_ROOT / group / event_type / "v1.json"
    return schema_path.exists()


def main() -> int:
    categories = find_emit_categories()
    if not categories:
        print(
            "[schema-check] no emit_event(...) sites found in services/api/spray.\n"
            "If this is unexpected, the regex needs updating.",
            file=sys.stderr,
        )
        return 2

    missing: list[str] = sorted(c for c in categories if not schema_exists(c))
    if missing:
        print("[schema-check] FAIL — missing schema(s):", file=sys.stderr)
        for c in missing:
            group, _, event_type = c.partition(".")
            expected = (
                SCHEMA_ROOT.relative_to(REPO_ROOT)
                / group
                / event_type
                / "v1.json"
            )
            print(f"  - {c}: expected {expected}", file=sys.stderr)
        return 1

    print(
        f"[schema-check] OK — {len(categories)} categories registered: "
        + ", ".join(sorted(categories))
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
