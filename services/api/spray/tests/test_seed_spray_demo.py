"""Demo seed command tests."""

from __future__ import annotations

import pytest
from django.core.management import call_command

from spray.models import (
    Block,
    BlockVerdict,
    IntegrationConnection,
    Membership,
    Org,
    SensorReading,
    SensorStationBlock,
    Vineyard,
    WeatherObservation,
)


pytestmark = pytest.mark.django_db


def test_seed_spray_demo_is_idempotent(make_user):
    owner = make_user(email="demo-owner@example.com")
    call_command(
        "seed_spray_demo",
        org_name="Demo Test Estate",
        owner_email=owner.email,
    )
    call_command(
        "seed_spray_demo",
        org_name="Demo Test Estate",
        owner_email=owner.email,
    )

    org = Org.objects.get(name="Demo Test Estate")
    vineyard = Vineyard.objects.get(org=org, name="Demo Estate")
    blocks = Block.objects.filter(vineyard=vineyard)

    assert blocks.count() == 3
    assert IntegrationConnection.objects.filter(org=org).count() == 1
    assert SensorStationBlock.objects.filter(block__vineyard=vineyard).count() == 3
    assert SensorReading.objects.filter(station__connection__org=org).count() == 24
    assert (
        WeatherObservation.objects.filter(station__org=org, is_forecast=True).count()
        == 72
    )
    assert BlockVerdict.objects.filter(block__vineyard=vineyard).count() == 3
    assert Membership.objects.get(org=org, user=owner).role == Membership.Role.OWNER
    actions = BlockVerdict.objects.filter(block__vineyard=vineyard).values_list(
        "action",
        flat=True,
    )
    assert set(actions) == {
        "hold",
        "scout",
        "spray",
    }
