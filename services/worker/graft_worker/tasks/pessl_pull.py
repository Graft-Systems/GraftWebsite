"""Pessl polling shim (M1.5 PR-D → PR-E generalization).

PR-D shipped a per-vendor polling task here. PR-E generalized that to
`sensor_pull.pull_sensor_station(station_id, vendor_slug)`. This module
is now a backward-compatibility shim so the existing beat-schedule
entry + any in-flight queued tasks continue to resolve.

New code should call `sensor_pull` directly.
"""

from __future__ import annotations

from celery import shared_task

from graft_worker.tasks.sensor_pull import (
    pull_all_sensor_stations,
    pull_sensor_station,
)


@shared_task(name="graft_worker.tasks.pessl_pull.pull_all_pessl_stations")
def pull_all_pessl_stations() -> int:
    """Backward-compat alias — fans out Pessl pulls via sensor_pull."""
    return pull_all_sensor_stations("pessl")


@shared_task(
    bind=True,
    name="graft_worker.tasks.pessl_pull.pull_pessl_station",
    max_retries=4,
)
def pull_pessl_station(self, station_id: str) -> int:
    """Backward-compat alias for queued tasks from PR-D."""
    return pull_sensor_station(station_id, "pessl")
