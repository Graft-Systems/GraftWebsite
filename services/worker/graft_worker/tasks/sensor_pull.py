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

Implementation lives in ``spray.sensor_reading_pull`` so the Django API can
run the same logic without importing ``graft_worker``.

Cadences are env-overridable per vendor:
- GRAFT_SPRAY_PESSL_CADENCE_SEC  (default 900)
- GRAFT_SPRAY_DAVIS_CADENCE_SEC  (default 900)
- GRAFT_SPRAY_METER_CADENCE_SEC  (default 3600)
"""

from __future__ import annotations

import logging

from celery import shared_task

from spray.connectors.base import (
    ConnectorAuthError,
    ConnectorRateLimitError,
    ConnectorResponseError,
)
from spray.sensor_reading_pull import execute_pull_sensor_station

logger = logging.getLogger(__name__)


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
    return execute_pull_sensor_station(station_id, vendor_slug)
