"""Celery app definition + beat schedule (M0-04 step 8).

The app boots with the same Django settings module as services/api so
the ORM works out of the box. CELERY_BROKER_URL points at Render's
managed Redis in prod; in local dev the docker compose `redis` service.
"""

from __future__ import annotations

import os

import django
from celery import Celery
from celery.schedules import crontab, schedule


# Configure Django before importing any spray.* models.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "graft_api.settings")

# services/api lives one level up; add it to the import path so
# `spray.models` resolves when the worker runs.
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parent.parent.parent / "api"
sys.path.insert(0, str(API_ROOT))

django.setup()


app = Celery("graft_worker")
app.conf.broker_url = os.environ.get(
    "CELERY_BROKER_URL", "redis://localhost:6379/0"
)
app.conf.result_backend = os.environ.get(
    "CELERY_RESULT_BACKEND", "redis://localhost:6379/1"
)

# Discover tasks automatically.
app.autodiscover_tasks(["graft_worker.tasks"])

# Beat schedule (per spec §11.4 + this milestone's own ETL).
app.conf.beat_schedule = {
    "data-lake-etl": {
        # Forwards pending DataLakeEvent rows to S3 every 15 minutes.
        "task": "graft_worker.tasks.data_lake_etl.forward_pending_events",
        "schedule": schedule(900.0),
    },
    # M0-06: weather + SA-1 external risk indices, hourly.
    "weather-pull": {
        "task": "graft_worker.tasks.weather_pull.pull_all_active_stations",
        "schedule": schedule(3600.0),
    },
    "external-risk-index-pull": {
        "task": (
            "graft_worker.tasks.external_risk_index.pull_all_external_indices"
        ),
        "schedule": schedule(3600.0),
    },
    # M1.5 PR-C: aggregation engine. Beat fires hourly; the task itself
    # short-circuits when out of season (April–October UTC).
    "aggregation-run": {
        "task": (
            "graft_worker.tasks.aggregation_run.compute_all_active_blocks"
        ),
        "schedule": schedule(
            float(
                __import__("os").environ.get(
                    "GRAFT_SPRAY_AGGREGATION_CADENCE_SEC", "3600"
                )
            )
        ),
    },
    # Daily conidial PMI (UTC calendar days); short-circuits out-of-season
    # unless GRAFT_SPRAY_PMI_ROLLUP_FORCE is set on the worker.
    "pmi-rollup-daily": {
        "task": "graft_worker.tasks.pmi_rollup.rollup_all_blocks_pmi_task",
        "schedule": crontab(hour=6, minute=30),
    },
    # M1.5 PR-D: Pessl FieldClimate sensor polling (15 min default).
    # The task short-circuits when no active Pessl connections exist,
    # so this is safe to fire even before any user has connected.
    "pessl-pull": {
        "task": "graft_worker.tasks.pessl_pull.pull_all_pessl_stations",
        "schedule": schedule(
            float(
                __import__("os").environ.get(
                    "GRAFT_SPRAY_PESSL_CADENCE_SEC", "900"
                )
            )
        ),
    },
    # M1.5 PR-E: Davis WeatherLink polling (15 min default).
    "davis-pull": {
        "task": "graft_worker.tasks.davis_pull.pull_all_davis_stations",
        "schedule": schedule(
            float(
                __import__("os").environ.get(
                    "GRAFT_SPRAY_DAVIS_CADENCE_SEC", "900"
                )
            )
        ),
    },
    # M1.5 PR-E: METER ZENTRA polling — gap-fill only. Real-time data
    # flows through the webhook receiver. 60 min default cadence.
    "meter-pull": {
        "task": "graft_worker.tasks.meter_pull.pull_all_meter_stations",
        "schedule": schedule(
            float(
                __import__("os").environ.get(
                    "GRAFT_SPRAY_METER_CADENCE_SEC", "3600"
                )
            )
        ),
    },
}

app.conf.timezone = "UTC"
