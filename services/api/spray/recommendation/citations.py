"""Citation lookup keyed by citation_id from sources_master.csv.

Loads on first call, caches in-process for the worker / API lifetime.
Schema of sources_master.csv (per `docs/research/00_index.md`):

    id,category,source_id,kind,title,authors,year,...

The citation_id pattern is `<category>-<S|P>NN` (e.g. `06-S2`, `01-P3`)
matching the `[Brain N / S#]` / `[Brain N / P#]` references throughout
the spec. This module exposes a `lookup(citation_id)` that returns the
row as a dict, or None.
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Resolve to repo root: services/api/spray/recommendation/citations.py
# → ../../../../docs/research/sources_master.csv
_DEFAULT_PATH = (
    Path(__file__).resolve().parents[4]
    / "docs"
    / "research"
    / "sources_master.csv"
)

_CACHE: dict[str, dict[str, Any]] | None = None

# Legacy / fixture citation tokens → canonical `NN-Sx` key in sources_master.csv.
_CITATION_ALIASES: dict[str, str] = {
    "GUBLER_2013": "06-S2",
}


def _canonical_citation_id(row: dict[str, Any]) -> str | None:
    """Build `06-S2` from `category=06_outbreak-prediction` + `ref_id=S2`."""
    cat = (row.get("category") or "").strip()
    ref = (row.get("ref_id") or "").strip()
    if not cat or not ref:
        return None
    head = cat.split("_", 1)[0]
    if not head.isdigit():
        return None
    return f"{head}-{ref}"


def _load(path: Path = _DEFAULT_PATH) -> dict[str, dict[str, Any]]:
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    rows: dict[str, dict[str, Any]] = {}
    if not path.exists():
        logger.warning("citations: sources_master.csv missing at %s", path)
        _CACHE = {}
        return _CACHE
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            row = dict(raw)
            canonical = _canonical_citation_id(row)
            if canonical:
                row["citation_id"] = canonical
                rows[canonical] = row
            legacy = (raw.get("citation_id") or raw.get("id") or "").strip()
            if legacy and legacy != canonical and legacy not in rows:
                rows[legacy] = dict(raw)
    for alias, target in _CITATION_ALIASES.items():
        if target in rows:
            rows[alias] = rows[target]
    _CACHE = rows
    logger.info("citations: loaded %d entries", len(rows))
    return _CACHE


def lookup(citation_id: str) -> dict[str, Any] | None:
    """Return the sources_master.csv row for `citation_id`, or None."""
    if not citation_id:
        return None
    return _load().get(citation_id)


def reset_cache() -> None:
    """Used by tests to force a re-read."""
    global _CACHE
    _CACHE = None


def lookup_many(citation_ids: list[str]) -> dict[str, dict[str, Any] | None]:
    """Bulk variant; returns `{cid: row | None}`."""
    return {cid: lookup(cid) for cid in citation_ids}
