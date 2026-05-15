"""GET /api/spray/orgs/<org>/blocks/<block>/sensor-readings tests."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from cryptography.fernet import Fernet
from django.contrib.gis.geos import Polygon
from django.test import override_settings
from django.utils import timezone

from spray.connectors import credentials
from spray.models import (
    Block,
    IntegrationConnection,
    Membership,
    Org,
    SensorReading,
    SensorStation,
    SensorStationBlock,
    Vineyard,
)

pytestmark = pytest.mark.django_db
TEST_KEY = Fernet.generate_key().decode()


def _poly():
    return Polygon(
        (
            (-122.3, 38.3),
            (-122.3, 38.31),
            (-122.29, 38.31),
            (-122.29, 38.3),
            (-122.3, 38.3),
        ),
        srid=4326,
    )


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_block_sensor_readings_returns_linked_station_rows(auth_client, make_membership):
    client, user = auth_client()
    org = Org.objects.create(name="Readings Org", region="napa")
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    v = Vineyard.objects.create(org=org, name="V", region="napa")
    block = Block.objects.create(vineyard=v, name="B", geom=_poly())
    ct = credentials.encrypt_token_blob({"api_key": "k"})
    conn = IntegrationConnection.objects.create(
        org=org,
        vendor="davis",
        vendor_account_id="a1",
        token_ciphertext=ct,
    )
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id="s1", name="North station"
    )
    SensorStationBlock.objects.create(station=station, block=block)
    base = timezone.now() - timedelta(hours=5)
    SensorReading.objects.create(
        station=station,
        ts=base,
        air_temp_c=Decimal("19.0"),
        rh_pct=Decimal("75"),
        quality_flag=SensorReading.QualityFlag.OK,
    )
    SensorReading.objects.create(
        station=station,
        ts=base + timedelta(hours=1),
        air_temp_c=Decimal("20.0"),
        rh_pct=Decimal("70"),
        quality_flag=SensorReading.QualityFlag.OK,
    )

    resp = client.get(
        f"/api/spray/orgs/{org.id}/blocks/{block.id}/sensor-readings?hours=72&limit=10"
    )
    assert resp.status_code == 200
    assert resp.data["block_id"] == str(block.id)
    assert resp.data["readings_total"] == 2
    assert len(resp.data["readings"]) == 2
    assert resp.data["readings_truncated"] is False
    assert resp.data["stations"][0]["id"] == str(station.id)
    # Newest first
    assert resp.data["readings"][0]["air_temp_c"] == 20.0
    assert resp.data["readings"][0]["station_name"] == "North station"


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_block_sensor_readings_empty_when_no_stations(auth_client, make_membership):
    client, user = auth_client()
    org = Org.objects.create(name="No Station Org", region="napa")
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    v = Vineyard.objects.create(org=org, name="V", region="napa")
    block = Block.objects.create(vineyard=v, name="B", geom=_poly())

    resp = client.get(f"/api/spray/orgs/{org.id}/blocks/{block.id}/sensor-readings")
    assert resp.status_code == 200
    assert resp.data["readings"] == []
    assert resp.data["readings_total"] == 0


def test_block_sensor_readings_rejects_cross_org(auth_client, make_org, make_membership, make_user):
    client, user = auth_client()
    org = make_org()
    make_membership(user=user, org=org, role=Membership.Role.ADMIN)
    v = Vineyard.objects.create(org=org, name="V", region=org.region)
    block = Block.objects.create(vineyard=v, name="B", geom=_poly())
    other_client, _ = auth_client(make_user())

    resp = other_client.get(f"/api/spray/orgs/{org.id}/blocks/{block.id}/sensor-readings")
    assert resp.status_code in (403, 404)
