"""Visual Crossing adapter tests (M0-06)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import responses
from django.contrib.gis.geos import Point
from django.test import override_settings

from spray.models import WeatherStation
from spray.providers.base import (
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderResponseError,
)
from spray.providers.visual_crossing import VisualCrossingProvider


pytestmark = pytest.mark.django_db


def _station():
    return WeatherStation.objects.create(
        provider="visual_crossing",
        station_id="vc-test",
        location=Point(-122.31, 38.30, srid=4326),
        is_regional_default=True,
        region="napa",
    )


def _payload(hours=2):
    base_epoch = 1714824000  # 2024-05-04 12:00 UTC
    return {
        "days": [
            {
                "hours": [
                    {
                        "datetimeEpoch": base_epoch + i * 3600,
                        "temp": 18.5 + i,
                        "humidity": 70 - i,
                        "windspeed": 12.0,
                        "precip": 0.0,
                        "leafwetness": 0.0,
                    }
                    for i in range(hours)
                ]
            }
        ]
    }


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_fetch_observations_happy_path():
    s = _station()
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json=_payload(2),
        status=200,
    )
    obs = VisualCrossingProvider().fetch_observations(
        s, since=datetime(2024, 5, 4, tzinfo=timezone.utc)
    )
    assert len(obs) == 2
    assert obs[0].temp_c == Decimal("18.5")
    assert obs[0].rh_pct == Decimal("70.00")
    # 12 km/h ≈ 3.33 m/s
    assert obs[0].wind_speed_ms == Decimal("3.33")


@override_settings(VISUAL_CROSSING_API_KEY="")
def test_missing_api_key_raises():
    s = _station()
    with pytest.raises(ProviderAuthError):
        VisualCrossingProvider().fetch_observations(
            s, since=datetime(2024, 5, 4, tzinfo=timezone.utc)
        )


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_429_raises_rate_limit():
    s = _station()
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json={"error": "too many"},
        status=429,
    )
    with pytest.raises(ProviderRateLimitError):
        VisualCrossingProvider().fetch_observations(
            s, since=datetime(2024, 5, 4, tzinfo=timezone.utc)
        )


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_5xx_raises_response_error():
    s = _station()
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        body="upstream broken",
        status=503,
    )
    with pytest.raises(ProviderResponseError):
        VisualCrossingProvider().fetch_observations(
            s, since=datetime(2024, 5, 4, tzinfo=timezone.utc)
        )


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_partial_data_response_no_crash():
    """Some hours missing fields → null mapped, no exception."""
    s = _station()
    payload = {
        "days": [
            {
                "hours": [
                    {
                        "datetimeEpoch": 1714824000,
                        # No temp, no humidity → should map to None.
                        "windspeed": 5.0,
                    }
                ]
            }
        ]
    }
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json=payload,
        status=200,
    )
    obs = VisualCrossingProvider().fetch_observations(
        s, since=datetime(2024, 5, 4, tzinfo=timezone.utc)
    )
    assert len(obs) == 1
    assert obs[0].temp_c is None
    assert obs[0].rh_pct is None
