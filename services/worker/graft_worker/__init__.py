"""Graft Spray worker package (M0-04).

Celery + Redis worker that runs background jobs:

  - data_lake_etl: forwards DataLakeEvent rows to S3 as Parquet (M0-04)
  - weather_pull: hourly weather adapter (M0-06)
  - external_risk_index: SA-1 UC IPM + uspest aggregation (M0-06b)
  - risk_index: per-block disease forecasts (M1-07/08)
  - notification_dispatch: push and email (M1-16)

The worker shares the Django ORM with services/api by importing
`spray.models` directly. Only the worker process holds a Celery
connection; the API never publishes tasks at M0-04.
"""

from graft_worker.celery import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
