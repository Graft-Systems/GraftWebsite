"""WeatherStation / WeatherObservation / ExternalRiskIndex model tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from django.contrib.gis.geos import Point
from django.db import IntegrityError
from django.utils import timezone as dj_timezone

from spray.models import (
    ExternalRiskIndex,
    WeatherObservation,
    WeatherStation,
)


pytestmark = pytest.mark.django_db


def _ws(**kwargs):
    defaults = dict(
        provider="visual_crossing",
        station_id="vc-test-1",
        location=Point(-122.31, 38.30, srid=4326),
        is_regional_default=True,
        region="napa",
    )
    defaults.update(kwargs)
    return WeatherStation.objects.create(**defaults)


def test_weatherstation_unique_provider_station():
    _ws(station_id="abc")
    with pytest.raises(IntegrityError):
        _ws(station_id="abc")


def test_weatherobservation_unique_station_ts():
    s = _ws()
    ts = datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc)
    WeatherObservation.objects.create(station=s, ts=ts, temp_c=20)
    with pytest.raises(IntegrityError):
        WeatherObservation.objects.create(station=s, ts=ts, temp_c=21)


def test_weatherobservation_is_forecast_default_false():
    s = _ws()
    obs = WeatherObservation.objects.create(
        station=s, ts=datetime(2026, 5, 4, 12, 0, tzinfo=timezone.utc), temp_c=20
    )
    assert obs.is_forecast is False


def test_externalriskindex_unique_region_source_hour():
    hour = dj_timezone.now().replace(minute=0, second=0, microsecond=0)
    ExternalRiskIndex.objects.create(
        region="napa",
        source=ExternalRiskIndex.Source.UC_IPM_GRAPE_PM,
        risk_level=ExternalRiskIndex.RiskLevel.LOW,
        pulled_at_hour=hour,
    )
    with pytest.raises(IntegrityError):
        ExternalRiskIndex.objects.create(
            region="napa",
            source=ExternalRiskIndex.Source.UC_IPM_GRAPE_PM,
            risk_level=ExternalRiskIndex.RiskLevel.MODERATE,
            pulled_at_hour=hour,
        )


def test_externalriskindex_different_sources_same_region_ok():
    hour = dj_timezone.now().replace(minute=0, second=0, microsecond=0)
    ExternalRiskIndex.objects.create(
        region="napa",
        source=ExternalRiskIndex.Source.UC_IPM_GRAPE_PM,
        risk_level=ExternalRiskIndex.RiskLevel.LOW,
        pulled_at_hour=hour,
    )
    ExternalRiskIndex.objects.create(
        region="napa",
        source=ExternalRiskIndex.Source.USPEST_GRAPE_PM,
        risk_level=ExternalRiskIndex.RiskLevel.LOW,
        pulled_at_hour=hour,
    )
    assert ExternalRiskIndex.objects.count() == 2
