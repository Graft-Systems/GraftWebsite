"""In-process sensor reading pull (shared by API and Celery worker).

``graft_worker`` is not on the Django API ``PYTHONPATH`` when you run
``runserver`` from ``services/api``; this module lives in ``spray`` so
``IntegrationStationPullReadingsView`` and the worker task can call the
same code without ``import graft_worker``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone as dt_tz
from decimal import Decimal
from typing import Any, TypedDict

from django.db import transaction

from spray.connectors.base import ConnectorAuthError
from spray.lake import emit_event
from spray.models import IntegrationConnection, SensorReading, SensorStation

logger = logging.getLogger(__name__)

GAP_FILL_THRESHOLD_SEC = 4 * 3600
BACKFILL_WINDOW_DAYS = 14

# WeatherLink v2 ``GET /historic/{id}`` rejects windows wider than 86400 seconds
# (see API error: "Time range requested exceeds maximum of 86400 seconds").
DAVIS_HISTORIC_MAX_RANGE = timedelta(seconds=86400)

# Cap rows returned in API pull responses (full upsert still processes all).
MAX_READINGS_IN_PULL_DETAIL = 500


class PullSensorStationResult(TypedDict):
    """Structured result from ``execute_pull_sensor_station`` (sync API + worker)."""

    count: int
    readings: list[dict[str, Any]]
    readings_total: int
    readings_truncated: bool
    gap_fill: bool
    since_utc: str | None
    until_utc: str
    vendor: str
    vendor_station_id: str
    station_name: str


def _empty_pull_result(
    *,
    vendor: str,
    vendor_station_id: str = "",
    station_name: str = "",
    since_utc: str | None = None,
    until_utc: str | None = None,
) -> PullSensorStationResult:
    now = (
        datetime.now(tz=dt_tz.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    return {
        "count": 0,
        "readings": [],
        "readings_total": 0,
        "readings_truncated": False,
        "gap_fill": False,
        "since_utc": since_utc,
        "until_utc": until_utc or now,
        "vendor": vendor,
        "vendor_station_id": vendor_station_id,
        "station_name": station_name,
    }


def _serialize_reading_row(reading: SensorReading) -> dict[str, Any]:
    return {
        "ts": reading.ts.astimezone(dt_tz.utc).isoformat().replace("+00:00", "Z"),
        "air_temp_c": _decimal_or_none(reading.air_temp_c),
        "rh_pct": _decimal_or_none(reading.rh_pct),
        "leaf_wetness_min": _decimal_or_none(reading.leaf_wetness_min),
        "precip_mm": _decimal_or_none(reading.precip_mm),
        "wind_speed_ms": _decimal_or_none(reading.wind_speed_ms),
        "quality_flag": reading.quality_flag,
    }


def davis_clamp_historic_since(since: datetime, now_utc: datetime) -> datetime:
    """Clamp ``since`` for Davis ``/historic`` (max 24h window; min ~3h lookback)."""
    min_since = now_utc - timedelta(hours=3)
    if since > min_since:
        since = min_since
    oldest = now_utc - DAVIS_HISTORIC_MAX_RANGE
    if since < oldest:
        since = oldest
    return since


def _watermark(station: SensorStation, now_utc: datetime) -> datetime:
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


def execute_pull_sensor_station(
    station_id: str, vendor_slug: str
) -> PullSensorStationResult:
    """Pull readings for one station, upsert + emit events.

    Returns a structured dict; Celery tasks should use ``result["count"]``.
    """
    now_utc = datetime.now(tz=dt_tz.utc)
    until_iso = now_utc.isoformat().replace("+00:00", "Z")

    try:
        station = (
            SensorStation.objects.unscoped()
            .select_related("connection", "connection__org")
            .get(id=station_id)
        )
    except SensorStation.DoesNotExist:
        logger.warning("execute_pull_sensor_station: station %s vanished", station_id)
        return _empty_pull_result(vendor=vendor_slug, until_utc=until_iso)

    connection = station.connection
    meta = {
        "vendor": str(connection.vendor),
        "vendor_station_id": station.vendor_station_id,
        "station_name": station.name or "",
    }
    if connection.vendor != vendor_slug:
        logger.warning(
            "execute_pull_sensor_station: vendor mismatch (station=%s vendor=%s expected=%s)",
            station_id,
            connection.vendor,
            vendor_slug,
        )
        return _empty_pull_result(**meta, until_utc=until_iso)
    if connection.status != IntegrationConnection.Status.ACTIVE:
        return _empty_pull_result(**meta, until_utc=until_iso)
    if station.archived_at is not None:
        return _empty_pull_result(**meta, until_utc=until_iso)

    since = _watermark(station, now_utc)
    if vendor_slug == "davis":
        since = davis_clamp_historic_since(since, now_utc)
    since_iso = since.astimezone(dt_tz.utc).isoformat().replace("+00:00", "Z")

    is_gap_fill = (
        station.last_seen_at is not None
        and (now_utc - station.last_seen_at).total_seconds() > GAP_FILL_THRESHOLD_SEC
    )

    from spray.connectors.registry import get_connector

    connector = get_connector(vendor_slug)
    try:
        readings = connector.fetch_readings(connection, station, since=since)
    except ConnectorAuthError:
        logger.warning(
            "execute_pull_sensor_station: auth failed for vendor=%s station=%s",
            vendor_slug,
            station_id,
        )
        return _empty_pull_result(
            **meta, since_utc=since_iso, until_utc=until_iso
        )

    if not readings:
        return {
            "count": 0,
            "readings": [],
            "readings_total": 0,
            "readings_truncated": False,
            "gap_fill": is_gap_fill,
            "since_utc": since_iso,
            "until_utc": until_iso,
            **meta,
        }

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

    total = len(readings)
    truncated = total > MAX_READINGS_IN_PULL_DETAIL
    detail = [
        _serialize_reading_row(r)
        for r in readings[:MAX_READINGS_IN_PULL_DETAIL]
    ]

    logger.info(
        "execute_pull_sensor_station: vendor=%s station=%s wrote=%d gap_fill=%s",
        vendor_slug,
        station_id,
        total,
        is_gap_fill,
    )
    return {
        "count": total,
        "readings": detail,
        "readings_total": total,
        "readings_truncated": truncated,
        "gap_fill": is_gap_fill,
        "since_utc": since_iso,
        "until_utc": until_iso,
        **meta,
    }
