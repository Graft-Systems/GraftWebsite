"""Event schema registry (M0-04 step 3).

Loads JSON Schema documents from disk at first call, caches them, and
exposes `validate(category, payload, version)` which raises
`SchemaValidationError` on miss or invalid payload.

Schema layout:
    services/api/spray/schemas/events/<category-segment>/<type-segment>/v<n>.json

For the M0-03 events, `category` strings are dotted: `vineyard.created`,
`block.archived`, etc. The first segment becomes the directory name
under `events/`, the rest joins to form the second.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import jsonschema

logger = logging.getLogger(__name__)

SCHEMAS_ROOT = Path(__file__).resolve().parent / "events"


class SchemaValidationError(Exception):
    """Raised when a payload fails schema validation or no schema is registered."""


_CACHE: dict[str, dict[str, Any]] = {}


def _schema_path(category: str, version: int) -> Path:
    """Resolve `category` (e.g. `vineyard.created`) to the JSON file path."""
    if "." not in category:
        raise SchemaValidationError(
            f"category must use 'group.event' format (got {category!r})"
        )
    group, _, event_type = category.partition(".")
    return SCHEMAS_ROOT / group / event_type / f"v{version}.json"


def _load(category: str, version: int) -> dict[str, Any]:
    cache_key = f"{category}.v{version}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    path = _schema_path(category, version)
    if not path.exists():
        raise SchemaValidationError(
            f"no registered schema for event {category!r} version v{version} "
            f"(expected file at {path.relative_to(SCHEMAS_ROOT.parent.parent.parent)})"
        )
    with path.open("r", encoding="utf-8") as fh:
        schema = json.load(fh)
    _CACHE[cache_key] = schema
    return schema


def validate(*, category: str, payload: dict[str, Any], version: int = 1) -> None:
    """Validate `payload` against the registered schema; raise on miss or invalid.

    Raises:
        SchemaValidationError: schema not registered, or payload fails
            validation.
    """
    schema = _load(category, version)
    try:
        jsonschema.validate(payload, schema)
    except jsonschema.ValidationError as e:
        raise SchemaValidationError(
            f"payload for {category!r} v{version} failed validation: {e.message}"
        ) from e


def known_categories() -> list[str]:
    """Return all `<group>.<event>` pairs that have at least one schema file."""
    found: list[str] = []
    if not SCHEMAS_ROOT.exists():
        return found
    for group_dir in SCHEMAS_ROOT.iterdir():
        if not group_dir.is_dir():
            continue
        for event_dir in group_dir.iterdir():
            if not event_dir.is_dir():
                continue
            if any(event_dir.glob("v*.json")):
                found.append(f"{group_dir.name}.{event_dir.name}")
    return sorted(found)
