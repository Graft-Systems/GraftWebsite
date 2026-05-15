"""Visual Crossing adapter tests (M0-06)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
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
from spray.providers.visual_crossing import (
    VisualCrossingProvider,
    fetch_daily_weather_window,
)


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


@override_settings(VISUAL_CROSSING_API_KEY="")
def test_fetch_daily_weather_window_missing_key_returns_error():
    days, err = fetch_daily_weather_window(
        38.3, -122.3, date(2024, 5, 4), date(2024, 5, 5)
    )
    assert days == []
    assert err is not None


@override_settings(VISUAL_CROSSING_API_KEY="test-key")
@responses.activate
def test_fetch_daily_weather_window_aggregates_days():
    base = datetime(2024, 5, 4, 0, 0, tzinfo=timezone.utc)
    day0 = []
    day1 = []
    for h in range(24):
        ts0 = base + timedelta(hours=h)
        day0.append(
            {
                "datetimeEpoch": int(ts0.timestamp()),
                "temp": 10.0 + h * 0.5,
                "windspeed": 18.0 + h,
                "precip": 0.2 if h == 10 else 0.0,
                "precipprob": 10 + (h % 7),
            }
        )
    for h in range(24):
        ts1 = base + timedelta(days=1, hours=h)
        day1.append(
            {
                "datetimeEpoch": int(ts1.timestamp()),
                "temp": 5.0,
                "windspeed": 6.0,
                "precip": 0.0,
                "precipprob": 0.0,
            }
        )
    payload = {"days": [{"hours": day0}, {"hours": day1}]}
    responses.add(
        responses.GET,
        responses.matchers.re.compile(r"https://weather\.visualcrossing\.com/.*"),
        json=payload,
        status=200,
    )
    days, err = fetch_daily_weather_window(
        38.3000, -122.3000, date(2024, 5, 4), date(2024, 5, 5)
    )
    assert err is None
    assert len(days) == 2
    assert days[0]["date"] == "2024-05-04"
    assert days[0]["temp_max_f"] is not None
    assert days[0]["wind_max_mph"] is not None
    assert days[0]["precip_mm"] is not None
    assert days[0]["precip_prob_max"] is not None
    assert days[1]["date"] == "2024-05-05"
