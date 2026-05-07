"""Vendor-agnostic sensor polling tasks (M1.5 PR-E step 4).

Generalizes the per-vendor polling pattern PR-D shipped for Pessl. Two
task entry points:

  - pull_all_sensor_stations(vendor_slug): fans out per active station
    for one vendor. Beat fires per-vendor at the cadence of the calling
    schedule entry.

  - pull_sensor_station(station_id, vendor_slug): pulls readings for one
    station via the vendor's registered SensorConnector. Idempotent on
    (station, ts). Marks readings `quality_flag = "gap_filled"` when
    the station has been silent >4h (spec §12A.4).

Backward compatibility: `pessl_pull` and per-vendor specialized tasks
(`davis_pull`, `meter_pull`) are thin shims that delegate here. This
module is the source of truth.

Cadences are env-overridable per vendor:
- GRAFT_SPRAY_PESSL_CADENCE_SEC  (default 900)
- GRAFT_SPRAY_DAVIS_CADENCE_SEC  (default 900)
- GRAFT_SPRAY_METER_CADENCE_SEC  (default 3600)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone as dt_tz
from decimal import Decimal

from celery import shared_task
from django.db import transaction

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)


logger = logging.getLogger(__name__)


GAP_FILL_THRESHOLD_SEC = 4 * 3600  # 4h per spec §12A.4
BACKFILL_WINDOW_DAYS = 14


@shared_task(name="graft_worker.tasks.sensor_pull.pull_all_sensor_stations")
def pull_all_sensor_stations(vendor_slug: str) -> int:
    """Fan out per-station polls for one vendor."""
    from spray.models import IntegrationConnection, SensorStation

    qs = (
        SensorStation.objects.unscoped()
        .filter(
            connection__vendor=vendor_slug,
            connection__status=IntegrationConnection.Status.ACTIVE,
            archived_at__isnull=True,
        )
        .filter(linked_blocks__isnull=False)
        .distinct()
    )
    count = 0
    for station_id in qs.values_list("id", flat=True):
        pull_sensor_station.delay(str(station_id), vendor_slug)
        count += 1
    logger.info(
        "pull_all_sensor_stations: vendor=%s fanned out %d tasks",
        vendor_slug,
        count,
    )
    return count


@shared_task(
    bind=True,
    name="graft_worker.tasks.sensor_pull.pull_sensor_station",
    autoretry_for=(ConnectorRateLimitError, ConnectorResponseError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=4,
)
def pull_sensor_station(self, station_id: str, vendor_slug: str) -> int:
    """Pull readings for one station, upsert + emit events."""
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
        logger.warning("pull_sensor_station: station %s vanished", station_id)
        return 0

    connection = station.connection
    if connection.vendor != vendor_slug:
        logger.warning(
            "pull_sensor_station: vendor mismatch (station=%s vendor=%s expected=%s)",
            station_id,
            connection.vendor,
            vendor_slug,
        )
        return 0
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

    connector = get_connector(vendor_slug)
    try:
        readings = connector.fetch_readings(connection, station, since=since)
    except ConnectorAuthError:
        logger.warning(
            "pull_sensor_station: auth failed for vendor=%s station=%s",
            vendor_slug,
            station_id,
        )
        return 0

    if not readings:
        return 0

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
                "emit_event sensor.reading_pulled failed station=%s ts=%s",
                station_id,
                r.ts,
            )

    logger.info(
        "pull_sensor_station: vendor=%s station=%s wrote=%d gap_fill=%s",
        vendor_slug,
        station_id,
        len(readings),
        is_gap_fill,
    )
    return len(readings)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _watermark(station, now_utc: datetime) -> datetime:
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
