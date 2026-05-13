"""METER polling beat entry — gap-fill only (M1.5 PR-E).

Real-time data flows through the webhook receiver in
`spray.views.MeterWebhookView`. This task fires hourly to backfill any
window the webhook missed (vendor outage, our outage, station offline
recovery).
"""

from __future__ import annotations

from celery import shared_task

from graft_worker.tasks.sensor_pull import pull_all_sensor_stations


@shared_task(name="graft_worker.tasks.meter_pull.pull_all_meter_stations")
def pull_all_meter_stations() -> int:
    return pull_all_sensor_stations("meter")
