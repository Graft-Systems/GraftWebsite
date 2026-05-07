"""Generalized sensor-pull task tests (M1.5 PR-E step 8).

Covers the vendor-agnostic polling task that PR-D's pessl_pull was
generalized into. Validates per-vendor isolation: a Davis polling task
won't fetch readings for a Pessl station.
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


def _setup_for_vendor(vendor: str):
    org = Org.objects.create(name=f"O-{vendor}", region="napa")
    v = Vineyard.objects.create(
        org=org, name="V", region="napa", centroid=Point(-122.3, 38.3, srid=4326)
    )
    poly = Polygon(
        ((-122.3, 38.3), (-122.3, 38.4), (-122.2, 38.4), (-122.2, 38.3), (-122.3, 38.3)),
        srid=4326,
    )
    block = Block.objects.create(vineyard=v, name="B", geom=poly, variety="cab")
    with override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY):
        ct = credentials.encrypt_token_blob(
            {"api_key": "K", "api_secret": "S", "token": "T", "webhook_secret": "W"}
        )
    conn = IntegrationConnection.objects.create(
        org=org, vendor=vendor, vendor_account_id=f"acct-{vendor}",
        token_ciphertext=ct,
    )
    station = SensorStation.objects.create(
        connection=conn, vendor_station_id=f"{vendor}-1", name="N"
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
            quality_flag=SensorReading.QualityFlag.OK,
        )
        for i in range(n)
    ]


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_sensor_pull_persists_for_davis():
    from graft_worker.tasks.sensor_pull import pull_sensor_station

    _org, _conn, station = _setup_for_vendor("davis")

    class _Stub:
        def fetch_readings(self, *a, **kw):
            return _fake_readings(station)

    with patch("spray.connectors.registry.get_connector", return_value=_Stub()):
        n = pull_sensor_station(str(station.id), "davis")
    assert n == 2
    assert SensorReading.objects.unscoped().filter(station=station).count() == 2


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_sensor_pull_vendor_mismatch_skipped():
    """Pessl station + davis slug → no-op."""
    from graft_worker.tasks.sensor_pull import pull_sensor_station

    _org, _conn, station = _setup_for_vendor("pessl")

    with patch("spray.connectors.registry.get_connector") as mock_get:
        n = pull_sensor_station(str(station.id), "davis")
    assert n == 0
    mock_get.assert_not_called()


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_sensor_pull_gap_fill_marks_readings():
    from graft_worker.tasks.sensor_pull import pull_sensor_station

    _org, _conn, station = _setup_for_vendor("davis")
    station.last_seen_at = datetime.now(tz=timezone.utc) - timedelta(hours=12)
    station.save(update_fields=["last_seen_at"])

    class _Stub:
        def fetch_readings(self, *a, **kw):
            return _fake_readings(station, base=datetime.now(tz=timezone.utc))

    with patch("spray.connectors.registry.get_connector", return_value=_Stub()):
        pull_sensor_station(str(station.id), "davis")

    flags = list(
        SensorReading.objects.unscoped()
        .filter(station=station)
        .values_list("quality_flag", flat=True)
    )
    assert all(f == SensorReading.QualityFlag.GAP_FILLED for f in flags)


@override_settings(SPRAY_INTEGRATION_FERNET_KEY=TEST_KEY)
def test_pull_all_sensor_stations_fans_out_per_vendor():
    from graft_worker.tasks.sensor_pull import pull_all_sensor_stations

    _setup_for_vendor("davis")
    _setup_for_vendor("meter")
    _setup_for_vendor("pessl")

    with patch(
        "graft_worker.tasks.sensor_pull.pull_sensor_station.delay"
    ) as mock_delay:
        n = pull_all_sensor_stations("davis")
    assert n == 1
    # Davis fan-out only enqueues davis stations.
    args = [call.args for call in mock_delay.call_args_list]
    assert all(slug == "davis" for _, slug in args)
