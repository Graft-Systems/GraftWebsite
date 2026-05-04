"""DataLakeEvent emission helper (M0-04 step 4).

`emit_event(...)` validates the payload against the registered JSON
Schema, then creates the row. Replaces the M0-03 `_emit_lake_event`
inline helper from `views.py` so every emit site goes through schema
validation.
"""

from __future__ import annotations

from typing import Any

from spray.models import DataLakeEvent, Org, User
from spray.schemas import registry


def emit_event(
    *,
    category: str,
    payload: dict[str, Any],
    org: Org | None = None,
    user: User | None = None,
    schema_version: int = 1,
) -> DataLakeEvent:
    """Validate payload against the registered schema, then persist.

    Raises:
        spray.schemas.registry.SchemaValidationError: schema not registered
            or payload invalid.
    """
    registry.validate(category=category, payload=payload, version=schema_version)
    return DataLakeEvent.objects.unscoped().create(
        org=org,
        user=user,
        category=category,
        schema_version=f"v{schema_version}",
        payload=payload,
    )
