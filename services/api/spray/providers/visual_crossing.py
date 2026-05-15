"""Visual Crossing weather adapter (M0-06 step 5).

Free-tier endpoint: 1,000 records/day; commercial use permitted with
attribution. The Timeline API returns hourly observations and forecasts
in a single call, with leaf-wetness pre-computed (CART-derived).

Docs: https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
"""

from __future__ import annotations

import time
from datetime import date, datetime, timedelta, timezone as dt_tz
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings

from spray.providers.base import (
    ProviderAuthError,
    ProviderHealth,
    ProviderRateLimitError,
    ProviderResponseError,
)
from spray.providers.registry import register_weather

TIMELINE_URL = (
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/"
    "timeline/{lat:.4f},{lon:.4f}/{start}/{end}"
)


def _api_key() -> str:
    key = getattr(settings, "VISUAL_CROSSING_API_KEY", "") or ""
    if not key:
        raise ProviderAuthError("VISUAL_CROSSING_API_KEY env var not set")
    return key


def _km_h_to_m_s(km_h: float | None) -> Decimal | None:
    if km_h is None:
        return None
    return Decimal(str(round(km_h * 0.27778, 2)))


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(round(float(value), 2)))
    except (TypeError, ValueError):
        return None


def _hour_to_observation(
    hour: dict[str, Any], station, ts: datetime, *, is_forecast: bool
):
    """Map a single Visual Crossing hour to a `WeatherObservation` instance."""
    from spray.models import WeatherObservation

    # Visual Crossing's `leafwetness` is a 0-1 indicator; map to minutes
    # by treating 1 as "wet for the full hour" (60 min). When a sensor
    # array is connected later, the field can carry actual minute counts.
    lw = hour.get("leafwetness")
    if lw is None:
        leaf_wetness_min = None
    else:
        try:
            leaf_wetness_min = Decimal(str(round(float(lw) * 60, 2)))
        except (TypeError, ValueError):
            leaf_wetness_min = None

    return WeatherObservation(
        station=station,
        ts=ts,
        temp_c=_to_decimal(hour.get("temp")),
        rh_pct=_to_decimal(hour.get("humidity")),
        leaf_wetness_min=leaf_wetness_min,
        wind_speed_ms=_km_h_to_m_s(hour.get("windspeed")),
        precip_mm=_to_decimal(hour.get("precip")),
        is_forecast=is_forecast,
        raw=hour,
    )


def _request(url: str, params: dict[str, Any]) -> dict[str, Any]:
    started = time.time()
    try:
        resp = requests.get(url, params=params, timeout=15)
    except requests.RequestException as e:
        raise ProviderResponseError(f"network error: {e}") from e
    elapsed_ms = (time.time() - started) * 1000

    if resp.status_code == 401 or resp.status_code == 403:
        raise ProviderAuthError(f"auth failed ({resp.status_code})")
    if resp.status_code == 429:
        raise ProviderRateLimitError("rate limited")
    if resp.status_code >= 500:
        raise ProviderResponseError(f"upstream {resp.status_code}")
    if resp.status_code >= 400:
        raise ProviderResponseError(f"http {resp.status_code}: {resp.text[:200]}")

    try:
        payload = resp.json()
    except ValueError as e:
        raise ProviderResponseError(f"invalid json: {e}") from e
    payload["_latency_ms"] = elapsed_ms
    return payload


def _iter_hours(payload: dict[str, Any]):
    """Yield `(timestamp, hour_dict)` tuples from a Timeline response.

    The response shape: payload["days"] is a list of day-dicts, each with
    a "hours" list of hour-dicts. Each hour has `datetimeEpoch` (UTC s).
    """
    for day in payload.get("days", []):
        for hour in day.get("hours", []):
            epoch = hour.get("datetimeEpoch")
            if epoch is None:
                continue
            ts = datetime.fromtimestamp(int(epoch), tz=dt_tz.utc)
            yield ts, hour


@register_weather
class VisualCrossingProvider:
    PROVIDER_SLUG = "visual_crossing"

    def fetch_observations(self, station, since: datetime):
        lon, lat = station.location.x, station.location.y
        end = datetime.now(tz=dt_tz.utc)
        url = TIMELINE_URL.format(
            lat=lat, lon=lon, start=since.date().isoformat(), end=end.date().isoformat()
        )
        payload = _request(
            url,
            {
                "key": _api_key(),
                "unitGroup": "metric",
                "include": "hours",
                "elements": (
                    "datetimeEpoch,temp,humidity,windspeed,precip,leafwetness"
                ),
            },
        )
        return [
            _hour_to_observation(h, station, ts, is_forecast=False)
            for ts, h in _iter_hours(payload)
            if ts >= since and ts <= end
        ]

    def fetch_forecast(self, station, days: int):
        lon, lat = station.location.x, station.location.y
        start = datetime.now(tz=dt_tz.utc).date()
        end = start + timedelta(days=max(1, days))
        url = TIMELINE_URL.format(
            lat=lat, lon=lon, start=start.isoformat(), end=end.isoformat()
        )
        payload = _request(
            url,
            {
                "key": _api_key(),
                "unitGroup": "metric",
                "include": "hours,fcst",
                "elements": (
                    "datetimeEpoch,temp,humidity,windspeed,precip,leafwetness"
                ),
            },
        )
        cutoff = datetime.now(tz=dt_tz.utc)
        return [
            _hour_to_observation(h, station, ts, is_forecast=True)
            for ts, h in _iter_hours(payload)
            if ts >= cutoff
        ]

    def health(self) -> ProviderHealth:
        try:
            key = _api_key()
        except ProviderAuthError as e:
            return ProviderHealth(ok=False, detail=str(e))
        # Tiny query: yesterday at the equator. Cheap and responsive.
        url = TIMELINE_URL.format(
            lat=0.0, lon=0.0, start="2024-01-01", end="2024-01-01"
        )
        try:
            payload = _request(
                url, {"key": key, "unitGroup": "metric", "include": "days"}
            )
            return ProviderHealth(ok=True, latency_ms=payload.get("_latency_ms"))
        except (ProviderResponseError, ProviderRateLimitError) as e:
            return ProviderHealth(ok=False, detail=str(e))


def fetch_daily_weather_window(
    lat: float, lon: float, start: date, end: date
) -> tuple[list[dict[str, Any]], str | None]:
    """Aggregate Visual Crossing hourly timeline into calendar-day summaries.

    Returns ``(days, error)`` where ``error`` is ``None`` on success. Each entry:

    - ``date``: ISO calendar date (YYYY-MM-DD)
    - ``temp_max_f``: daily maximum air temperature (°F), or ``None``
    - ``wind_max_mph``: daily maximum sustained wind (mph), or ``None``
    - ``precip_mm``: total liquid precipitation for the day (mm), or ``None``
    - ``precip_prob_max``: maximum hourly precip probability (0–100), or ``None``

    ``start`` and ``end`` are inclusive calendar bounds in the block's local sense;
    the Visual Crossing request uses the same calendar strings (UTC hour buckets
    are grouped by the hour's UTC date — acceptable for spray windows).
    """
    try:
        key = _api_key()
    except ProviderAuthError as exc:
        return [], str(exc)

    url = TIMELINE_URL.format(
        lat=lat, lon=lon, start=start.isoformat(), end=end.isoformat()
    )
    try:
        payload = _request(
            url,
            {
                "key": key,
                "unitGroup": "metric",
                "include": "hours",
                "elements": "datetimeEpoch,temp,windspeed,precip,precipprob",
            },
        )
    except ProviderAuthError as exc:
        return [], str(exc)
    except (ProviderResponseError, ProviderRateLimitError) as exc:
        return [], str(exc)

    buckets: dict[date, dict[str, Any]] = {}
    for ts, hour in _iter_hours(payload):
        day = ts.date()
        if day < start or day > end:
            continue
        if day not in buckets:
            buckets[day] = {
                "tmax_c": None,
                "wmax_kmh": None,
                "pmm": 0.0,
                "pprobs": [],
            }
        b = buckets[day]
        temp = hour.get("temp")
        if temp is not None:
            try:
                tv = float(temp)
                b["tmax_c"] = tv if b["tmax_c"] is None else max(b["tmax_c"], tv)
            except (TypeError, ValueError):
                pass
        wind = hour.get("windspeed")
        if wind is not None:
            try:
                wv = float(wind)
                b["wmax_kmh"] = (
                    wv if b["wmax_kmh"] is None else max(b["wmax_kmh"], wv)
                )
            except (TypeError, ValueError):
                pass
        precip = hour.get("precip")
        if precip is not None:
            try:
                b["pmm"] += float(precip)
            except (TypeError, ValueError):
                pass
        pprob = hour.get("precipprob")
        if pprob is not None:
            try:
                b["pprobs"].append(float(pprob))
            except (TypeError, ValueError):
                pass

    out: list[dict[str, Any]] = []
    cur = start
    while cur <= end:
        b = buckets.get(cur)
        if not b or b["tmax_c"] is None:
            out.append(
                {
                    "date": cur.isoformat(),
                    "temp_max_f": None,
                    "wind_max_mph": None,
                    "precip_mm": None,
                    "precip_prob_max": None,
                }
            )
        else:
            tmax_f = round(b["tmax_c"] * 9.0 / 5.0 + 32.0, 1)
            w_mph = (
                None
                if b["wmax_kmh"] is None
                else round(float(b["wmax_kmh"]) * 0.621371, 1)
            )
            pprob_max = None
            if b["pprobs"]:
                pprob_max = int(round(max(b["pprobs"])))
            out.append(
                {
                    "date": cur.isoformat(),
                    "temp_max_f": tmax_f,
                    "wind_max_mph": w_mph,
                    "precip_mm": round(float(b["pmm"]), 2),
                    "precip_prob_max": pprob_max,
                }
            )
        cur += timedelta(days=1)

    return out, None
