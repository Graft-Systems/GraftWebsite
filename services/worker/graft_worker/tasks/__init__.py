"""Celery tasks for graft_worker.

Eagerly import every task module so @shared_task registers at worker
startup. Without these imports, Celery's autodiscover does not always
find tasks defined as subpackages and the beat schedule's task lookup
fails at fire time with `Received unregistered task`.
"""

from graft_worker.tasks import (  # noqa: F401
    aggregation_run,
    data_lake_etl,
    external_risk_index,
    pessl_pull,
    weather_pull,
)
