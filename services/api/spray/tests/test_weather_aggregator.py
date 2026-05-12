from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point, Polygon

from spray.aggregation.weather import build_block_weather_window
from spray.models import (
    Block,
    IntegrationConnection,
    Org,
    SensorReading,
    SensorStation,
    SensorStationBlock,
    Vineyard,
    WeatherObservation,
    WeatherStation,
)


pytestmark = pytest.mark.django_db


def _block():
    org = Org.objects.create(name="Grower", region="napa")
    vineyard = Vineyard.objects.create(
        org=org,
        name="Estate",
        region="napa",
        centroid=Point(-122.3, 38.3, srid=4326),
    )
    polygon = Polygon(
        (
            (-122.3, 38.3),
            (-122.3, 38.4),
            (-122.2, 38.4),
            (-122.2, 38.3),
            (-122.3, 38.3),
        ),
        srid=4326,
    )
    return Block.objects.create(vineyard=vineyard, name="North", geom=polygon)


def test_weather_window_fuses_block_sensor_readings_with_regional_fallback():
    block = _block()
    start = datetime(2026, 5, 12, 0, 0, tzinfo=timezone.utc)
    station = WeatherStation.objects.create(
        provider="visual_crossing",
        station_id="napa-default",
        name="Napa Default",
        location=Point(-122.3, 38.3, srid=4326),
        is_regional_default=True,
        region="napa",
    )
    WeatherObservation.objects.create(
        station=station,
        ts=start,
        temp_c=Decimal("18.0"),
        rh_pct=Decimal("70.0"),
        precip_mm=Decimal("1.2"),
    )

    connection = IntegrationConnection.objects.create(
        org=block.vineyard.org,
        vendor=IntegrationConnection.Vendor.DAVIS,
        vendor_account_id="acct-1",
        token_ciphertext=b"encrypted",
    )
    sensor_station = SensorStation.objects.create(
        connection=connection,
        vendor_station_id="davis-1",
        name="Block station",
    )
    SensorStationBlock.objects.create(station=sensor_station, block=block)
    SensorReading.objects.create(
        station=sensor_station,
        ts=start,
        air_temp_c=Decimal("24.0"),
        rh_pct=Decimal("82.0"),
    )

    window = build_block_weather_window(
        block=block,
        valid_from=start,
        valid_to=start + timedelta(hours=1),
    )

    assert len(window.observations) == 1
    hour = window.observations[0]
    assert 21.0 < hour.temp_c < 24.0
    assert 75.0 < hour.rh_pct < 82.0
    assert hour.precip_mm == 1.2
    assert set(hour.source_summary["source_kinds"]) == {
        "block_sensor",
        "regional_station",
    }


def test_weather_window_uses_regional_weather_when_no_sensor_reading_exists():
    block = _block()
    start = datetime(2026, 5, 12, 0, 0, tzinfo=timezone.utc)
    station = WeatherStation.objects.create(
        provider="visual_crossing",
        station_id="napa-default",
        name="Napa Default",
        location=Point(-122.3, 38.3, srid=4326),
        is_regional_default=True,
        region="napa",
    )
    WeatherObservation.objects.create(
        station=station,
        ts=start,
        temp_c=Decimal("18.0"),
        rh_pct=Decimal("70.0"),
        precip_mm=Decimal("1.2"),
    )

    window = build_block_weather_window(
        block=block,
        valid_from=start,
        valid_to=start + timedelta(hours=1),
    )

    assert len(window.observations) == 1
    assert window.observations[0].temp_c == 18.0
    assert window.observations[0].precip_mm == 1.2
