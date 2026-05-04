"""Weather-pull Celery tasks (M0-06 step 8).

Three task entry points:

  - pull_all_active_stations: fans out one `pull_station.delay(...)`
    per active WeatherStation. Beat fires this hourly.

  - pull_station: pulls observations for a single station from its
    configured provider. Idempotent on (station, ts). Retries with
    exponential backoff on ProviderRateLimitError.

  - backfill_vineyard_weather: pulls 14 days of hourly observations
    for the Vineyard's region-default station. Triggered async on
    Vineyard create.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone as dt_tz

from celery import shared_task
from django.db import transaction

from spray.providers.base import (
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderResponseError,
)

logger = logging.getLogger(__name__)


@shared_task(name="graft_worker.tasks.weather_pull.pull_all_active_stations")
def pull_all_active_stations() -> int:
    """Fan out hourly pull tasks for every active WeatherStation.

    Active = is_regional_default=True OR org is set. Stations without
    either flag are placeholders and skipped.
    """
    from spray.models import WeatherStation

    qs = WeatherStation.objects.filter(is_regional_default=True) | (
        WeatherStation.objects.exclude(org=None)
    )
    count = 0
    for station_id in qs.values_list("id", flat=True).distinct():
        pull_station.delay(str(station_id))
        count += 1
    logger.info("pull_all_active_stations: fanned out %d tasks", count)
    return count


@shared_task(
    bind=True,
    name="graft_worker.tasks.weather_pull.pull_station",
    autoretry_for=(ProviderRateLimitError, ProviderResponseError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=4,
)
def pull_station(self, station_id: str) -> int:
    """Pull observations for one station; bulk-upsert into Postgres."""
    from spray.lake import emit_event
    from spray.models import WeatherObservation, WeatherStation
    from spray.providers.registry import get_weather

    try:
        station = WeatherStation.objects.get(id=station_id)
    except WeatherStation.DoesNotExist:
        logger.warning("pull_station: station %s vanished", station_id)
        return 0

    provider = get_weather(station.provider)
    # Pull the most recent 6 hours; the unique constraint dedups.
    since = datetime.now(tz=dt_tz.utc) - timedelta(hours=6)

    try:
        obs = provider.fetch_observations(station, since=since)
    except ProviderAuthError as e:
        logger.error("pull_station: auth error on %s: %s", station_id, e)
        return 0  # No retry; ops fixes the env var.
    if not obs:
        return 0

    with transaction.atomic():
        WeatherObservation.objects.bulk_create(
            obs,
            update_conflicts=True,
            update_fields=["temp_c", "rh_pct", "leaf_wetness_min",
                           "wind_speed_ms", "precip_mm", "raw"],
            unique_fields=["station", "ts"],
        )
        from django.utils import timezone as dj_timezone
        WeatherStation.objects.filter(id=station_id).update(
            last_pull_at=dj_timezone.now()
        )

    emit_event(
        category="weather.observation_pulled",
        payload={
            "station_id": str(station_id),
            "provider": station.provider,
            "obs_count": len(obs),
            "earliest_ts": min(o.ts for o in obs).isoformat(),
            "latest_ts": max(o.ts for o in obs).isoformat(),
            "is_backfill": False,
        },
        org=station.org,
    )

    logger.info(
        "pull_station: %s wrote %d obs (provider=%s)",
        station_id,
        len(obs),
        station.provider,
    )
    return len(obs)


@shared_task(
    bind=True,
    name="graft_worker.tasks.weather_pull.backfill_vineyard_weather",
    autoretry_for=(ProviderRateLimitError, ProviderResponseError),
    retry_backoff=True,
    retry_backoff_max=900,
    max_retries=2,
)
def backfill_vineyard_weather(self, vineyard_id: str, *, days: int = 14) -> int:
    """Pull `days` of hourly observations for a Vineyard's regional default station."""
    from spray.lake import emit_event
    from spray.models import Vineyard, WeatherObservation, WeatherStation
    from spray.providers.registry import get_weather, region_default_weather_slug

    try:
        v = Vineyard.objects.unscoped().get(id=vineyard_id)
    except Vineyard.DoesNotExist:
        return 0

    slug = (v.settings or {}).get("weather_provider") or region_default_weather_slug(
        v.region
    )
    station = (
        WeatherStation.objects.filter(
            provider=slug, is_regional_default=True, region=v.region
        )
        .order_by("created_at")
        .first()
    )
    if station is None:
        logger.warning(
            "backfill_vineyard_weather: no regional-default station for %s/%s",
            slug,
            v.region,
        )
        return 0

    provider = get_weather(slug)
    since = datetime.now(tz=dt_tz.utc) - timedelta(days=days)
    try:
        obs = provider.fetch_observations(station, since=since)
    except ProviderAuthError as e:
        logger.error("backfill: auth error: %s", e)
        return 0

    if not obs:
        return 0

    with transaction.atomic():
        WeatherObservation.objects.bulk_create(
            obs,
            update_conflicts=True,
            update_fields=["temp_c", "rh_pct", "leaf_wetness_min",
                           "wind_speed_ms", "precip_mm", "raw"],
            unique_fields=["station", "ts"],
        )

    emit_event(
        category="weather.observation_pulled",
        payload={
            "station_id": str(station.id),
            "provider": slug,
            "obs_count": len(obs),
            "earliest_ts": min(o.ts for o in obs).isoformat(),
            "latest_ts": max(o.ts for o in obs).isoformat(),
            "is_backfill": True,
        },
        org=v.org,
    )
    return len(obs)
