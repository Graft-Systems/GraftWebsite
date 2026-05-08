"""Davis polling beat entry (M1.5 PR-E).

Thin shim over `sensor_pull` so the beat schedule entry has a stable
named task. New code calls `sensor_pull` directly.
"""

from __future__ import annotations

from celery import shared_task

from graft_worker.tasks.sensor_pull import pull_all_sensor_stations


@shared_task(name="graft_worker.tasks.davis_pull.pull_all_davis_stations")
def pull_all_davis_stations() -> int:
    return pull_all_sensor_stations("davis")
