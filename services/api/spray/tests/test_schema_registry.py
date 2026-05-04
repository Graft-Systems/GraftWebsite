"""Schema registry tests (M0-04)."""

from __future__ import annotations

import pytest

from spray.schemas import registry


def test_known_categories_includes_m0_03_events():
    cats = set(registry.known_categories())
    expected = {
        "vineyard.created",
        "vineyard.updated",
        "vineyard.archived",
        "block.created",
        "block.updated",
        "block.archived",
    }
    missing = expected - cats
    assert not missing, f"missing schema files for: {missing}"


def test_validate_accepts_well_formed_payload():
    registry.validate(
        category="vineyard.created",
        payload={
            "vineyard_id": "11111111-1111-1111-1111-111111111111",
            "name": "Klein Estate",
            "region": "napa",
        },
    )


def test_validate_rejects_missing_required_field():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.created",
            payload={"name": "anonymous"},  # missing vineyard_id
        )


def test_validate_rejects_unknown_category():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.exploded",
            payload={"vineyard_id": "11111111-1111-1111-1111-111111111111"},
        )


def test_validate_rejects_additional_properties():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.archived",
            payload={
                "vineyard_id": "11111111-1111-1111-1111-111111111111",
                "extra": "should be rejected",
            },
        )


def test_validate_rejects_unknown_version():
    with pytest.raises(registry.SchemaValidationError):
        registry.validate(
            category="vineyard.created",
            payload={
                "vineyard_id": "11111111-1111-1111-1111-111111111111",
                "name": "X",
            },
            version=99,
        )
