"""Pessl FieldClimate polling tasks (M1.5 PR-D step 7).

Two task entry points:

  - pull_all_pessl_stations: beat-fired every 15 min. Fans out one
    `pull_pessl_station.delay(...)` per active SensorStation that's
    linked to ≥1 Block under an active Pessl IntegrationConnection.
    Stations without block links are skipped (no consumer for the data).

  - pull_pessl_station: pulls readings for one station since its
    `last_seen_at` (or now-14d on first pull). Idempotent on
    (station, ts). Marks readings `quality_flag = "gap_filled"` when
    the station has been silent >4h (per spec §12A.4).
    Emits one `sensor.reading_pulled` lake event per reading.

Cadence is env-overridable via `GRAFT_SPRAY_PESSL_CADENCE_SEC`
(default 900s = 15 min).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone as dt_tz
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.utils import timezone as dj_tz

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)


logger = logging.getLogger(__name__)


PESSL_CADENCE_SEC = int(os.environ.get("GRAFT_SPRAY_PESSL_CADENCE_SEC", "900"))
GAP_FILL_THRESHOLD_SEC = 4 * 3600  # 4h per spec §12A.4
BACKFILL_WINDOW_DAYS = 14


@shared_task(name="graft_worker.tasks.pessl_pull.pull_all_pessl_stations")
def pull_all_pessl_stations() -> int:
    """Fan out per-station Pessl polls. Returns count of tasks dispatched."""
    from spray.models import IntegrationConnection, SensorStation

    qs = (
        SensorStation.objects.unscoped()
        .filter(
            connection__vendor=IntegrationConnection.Vendor.PESSL,
            connection__status=IntegrationConnection.Status.ACTIVE,
            archived_at__isnull=True,
        )
        .filter(linked_blocks__isnull=False)
        .distinct()
    )
    count = 0
    for station_id in qs.values_list("id", flat=True):
        pull_pessl_station.delay(str(station_id))
        count += 1
    logger.info("pull_all_pessl_stations: fanned out %d tasks", count)
    return count


@shared_task(
    bind=True,
    name="graft_worker.tasks.pessl_pull.pull_pessl_station",
    autoretry_for=(ConnectorRateLimitError, ConnectorResponseError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=4,
)
def pull_pessl_station(self, station_id: str) -> int:
    """Pull readings for one Pessl station, upsert + emit events.

    Returns the number of readings persisted (new + updated).
    """
    from spray.connectors.registry import get_connector
    from spray.lake import emit_event
    from spray.models import IntegrationConnection, SensorReading, SensorStation

    try:
        station = (
            SensorStation.objects.unscoped()
            .select_related("connection", "connection__org")
            .get(id=station_id)
        )
    except SensorStation.DoesNotExist:
        logger.warning("pull_pessl_station: station %s vanished", station_id)
        return 0

    connection = station.connection
    if connection.status != IntegrationConnection.Status.ACTIVE:
        return 0
    if station.archived_at is not None:
        return 0

    now_utc = datetime.now(tz=dt_tz.utc)
    since = _watermark(station, now_utc)

    is_gap_fill = (
        station.last_seen_at is not None
        and (now_utc - station.last_seen_at).total_seconds() > GAP_FILL_THRESHOLD_SEC
    )

    connector = get_connector(IntegrationConnection.Vendor.PESSL)
    try:
        readings = connector.fetch_readings(connection, station, since=since)
    except ConnectorAuthError:
        logger.warning(
            "pull_pessl_station: auth failed for station %s; marked needs_reauth",
            station_id,
        )
        return 0

    if not readings:
        return 0

    # Tag gap-filled rows.
    if is_gap_fill:
        for r in readings:
            r.quality_flag = SensorReading.QualityFlag.GAP_FILLED

    with transaction.atomic():
        SensorReading.objects.unscoped().bulk_create(
            readings,
            update_conflicts=True,
            update_fields=[
                "air_temp_c",
                "rh_pct",
                "leaf_wetness_min",
                "precip_mm",
                "wind_speed_ms",
                "quality_flag",
            ],
            unique_fields=["station", "ts"],
        )
        latest_ts = max(r.ts for r in readings)
        if station.last_seen_at is None or latest_ts > station.last_seen_at:
            station.last_seen_at = latest_ts
            station.save(update_fields=["last_seen_at"])

    org = connection.org
    for r in readings:
        try:
            emit_event(
                category="sensor.reading_pulled",
                payload=_reading_to_event_payload(r, station, connection),
                org=org,
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "emit_event sensor.reading_pulled failed for station=%s ts=%s",
                station_id,
                r.ts,
            )

    logger.info(
        "pull_pessl_station: station=%s wrote=%d gap_fill=%s",
        station_id,
        len(readings),
        is_gap_fill,
    )
    return len(readings)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _watermark(station, now_utc: datetime) -> datetime:
    """When was the most recent reading we have? Default: now - 14d."""
    if station.last_seen_at is not None:
        return station.last_seen_at
    return now_utc - timedelta(days=BACKFILL_WINDOW_DAYS)


def _decimal_or_none(v):
    if v is None:
        return None
    return float(v) if isinstance(v, Decimal) else v


def _reading_to_event_payload(reading, station, connection) -> dict:
    return {
        "org_id": str(connection.org_id),
        "connection_id": str(connection.id),
        "station_id": str(station.id),
        "vendor": connection.vendor,
        "vendor_station_id": station.vendor_station_id,
        "ts": reading.ts.astimezone(dt_tz.utc).isoformat().replace("+00:00", "Z"),
        "air_temp_c": _decimal_or_none(reading.air_temp_c),
        "rh_pct": _decimal_or_none(reading.rh_pct),
        "leaf_wetness_min": _decimal_or_none(reading.leaf_wetness_min),
        "precip_mm": _decimal_or_none(reading.precip_mm),
        "wind_speed_ms": _decimal_or_none(reading.wind_speed_ms),
        "quality_flag": reading.quality_flag,
        "source": connection.vendor,
        "device_id": station.vendor_station_id,
    }
