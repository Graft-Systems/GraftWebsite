"""emit_event helper tests (M0-04)."""

from __future__ import annotations

import pytest

from spray.lake import emit_event
from spray.models import DataLakeEvent
from spray.schemas import registry


pytestmark = pytest.mark.django_db


def test_emit_event_creates_row(make_org, make_user):
    org = make_org()
    user = make_user()
    event = emit_event(
        category="vineyard.created",
        payload={
            "vineyard_id": "11111111-1111-1111-1111-111111111111",
            "name": "Test",
        },
        org=org,
        user=user,
    )
    assert event.id is not None
    assert event.category == "vineyard.created"
    assert event.schema_version == "v1"
    assert event.org == org
    assert event.user == user
    assert event.forwarded_at is None


def test_emit_event_invalid_payload_no_row(make_org):
    org = make_org()
    with pytest.raises(registry.SchemaValidationError):
        emit_event(
            category="vineyard.created",
            payload={"name": "missing-vineyard-id"},
            org=org,
        )
    # No row should have been written.
    assert (
        DataLakeEvent.objects.unscoped()
        .filter(category="vineyard.created")
        .count()
        == 0
    )


def test_emit_event_unknown_category(make_org):
    org = make_org()
    with pytest.raises(registry.SchemaValidationError):
        emit_event(
            category="vineyard.haunted",
            payload={"vineyard_id": "x"},
            org=org,
        )
