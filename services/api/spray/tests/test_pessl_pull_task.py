"""Pessl polling task tests (M1.5 PR-D step 11).

Covers idempotent upsert, gap-fill flag, and lake-event emission. The
runners + connector are mocked at the registry boundary so we don't
need responses fixtures here.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from django.contrib.gis.geos import Point, Polygon
from django.test import override_settings

from spray.connectors import credentials
from spray.models import (
    Block,
    DataLakeEvent,
    IntegrationConnection,
    Org,
    SensorReading,
    SensorStation,
    SensorStationBlock,
    Vineyard,
)


pytestmark = pytest.mark.django_db
TEST_KEY = Fernet.generate_key().decode()


def _make_pessl_setup():
    org = Org.objects.create(name="P", region="napa")
    v = Vineyard.objects.create(
        org=org, name="V", region="napa", centroid=Point(-122.3, 38.3, srid=4326)
    )
    poly = Polygon(((-122.3, 38.3), (-122.3, 38.4), (-122.2, 38.4), (-122.2, 38.3), (-122.3, 38.3)), srid=4326)
    block = Block.objects.create(vineyard=v, name="B", geom=poly, variety="cab")
    with override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY):
        ct = credentials.encrypt_token_blob(
            {"access_token": "AT", "refresh_token": "RT", "expires_in": 3600}
        )
    conn = IntegrationConnection.objects.create(
        org=org,
        vendor=IntegrationConnection.Vendor.PESSL,
        vendor_account_id="pessl-uid",
        token_ciphertext=ct,
    )
    station = SensorStation.objects.create(
        connection=conn,
        vendor_station_id="STATION-A",
        name="North",
    )
    SensorStationBlock.objects.create(station=station, block=block)
    return org, conn, station


def _fake_readings(station, n=2, base=None):
    base = base or datetime(2026, 5, 7, 12, 0, tzinfo=timezone.utc)
    return [
        SensorReading(
            station=station,
            ts=base + timedelta(hours=i),
            air_temp_c=Decimal("18.5"),
            rh_pct=Decimal("80"),
            leaf_wetness_min=Decimal("12"),
            quality_flag=SensorReading.QualityFlag.OK,
        )
        for i in range(n)
    ]


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_pull_pessl_station_persists_and_emits():
    from graft_worker.tasks.pessl_pull import pull_pessl_station

    org, conn, station = _make_pessl_setup()

    class _StubConnector:
        def fetch_readings(self, *args, **kwargs):
            return _fake_readings(station)

    with patch(
        "spray.connectors.registry.get_connector",
        return_value=_StubConnector(),
    ):
        n = pull_pessl_station(str(station.id))

    assert n == 2
    assert SensorReading.objects.unscoped().filter(station=station).count() == 2
    station.refresh_from_db()
    assert station.last_seen_at is not None
    events = DataLakeEvent.objects.filter(category="sensor.reading_pulled")
    assert events.count() == 2


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_pull_pessl_station_idempotent_on_retry():
    from graft_worker.tasks.pessl_pull import pull_pessl_station

    org, conn, station = _make_pessl_setup()

    class _StubConnector:
        def fetch_readings(self, *args, **kwargs):
            return _fake_readings(station)

    with patch(
        "spray.connectors.registry.get_connector",
        return_value=_StubConnector(),
    ):
        pull_pessl_station(str(station.id))
        pull_pessl_station(str(station.id))

    # Same (station, ts) keys upserted; row count unchanged.
    assert SensorReading.objects.unscoped().filter(station=station).count() == 2


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_pull_pessl_station_marks_gap_filled_when_silent():
    from graft_worker.tasks.pessl_pull import pull_pessl_station

    org, conn, station = _make_pessl_setup()
    # Simulate >4h silence by stamping last_seen_at far in the past.
    station.last_seen_at = datetime.now(tz=timezone.utc) - timedelta(hours=12)
    station.save(update_fields=["last_seen_at"])

    class _StubConnector:
        def fetch_readings(self, *args, **kwargs):
            return _fake_readings(station, base=datetime.now(tz=timezone.utc))

    with patch(
        "spray.connectors.registry.get_connector",
        return_value=_StubConnector(),
    ):
        pull_pessl_station(str(station.id))

    flags = list(
        SensorReading.objects.unscoped()
        .filter(station=station)
        .values_list("quality_flag", flat=True)
    )
    assert all(f == SensorReading.QualityFlag.GAP_FILLED for f in flags)


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_pull_pessl_station_skips_disconnected_connection():
    from graft_worker.tasks.pessl_pull import pull_pessl_station

    org, conn, station = _make_pessl_setup()
    conn.status = IntegrationConnection.Status.DISCONNECTED
    conn.save(update_fields=["status"])

    with patch("spray.connectors.registry.get_connector") as mock_get:
        n = pull_pessl_station(str(station.id))
    assert n == 0
    mock_get.assert_not_called()
