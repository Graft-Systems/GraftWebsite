"""External-risk-index Celery tasks (M0-06 SA-1, step 8).

Two task entry points:

  - pull_all_external_indices: fans out one `pull_external_index.delay`
    per (region, source) pair. Beat fires this hourly.

  - pull_external_index: pulls a single (region, source) index, dedups
    via `(region, source, pulled_at_hour)` unique constraint.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction

from spray.providers.base import (
    ProviderRateLimitError,
    ProviderResponseError,
)

logger = logging.getLogger(__name__)


# Region × source matrix. Spec §11.7 + §12.5 — UC IPM covers California
# (Napa, Sonoma); USPest covers PNW (Sonoma overflow + future expansion).
_REGION_SOURCE_MATRIX: list[tuple[str, str]] = [
    ("napa", "uc_ipm_grape_pm"),
    ("sonoma", "uc_ipm_grape_pm"),
    ("sonoma", "uspest_grape_pm"),
]


@shared_task(name="graft_worker.tasks.external_risk_index.pull_all_external_indices")
def pull_all_external_indices() -> int:
    count = 0
    for region, source in _REGION_SOURCE_MATRIX:
        pull_external_index.delay(region, source)
        count += 1
    logger.info("pull_all_external_indices: fanned out %d tasks", count)
    return count


@shared_task(
    bind=True,
    name="graft_worker.tasks.external_risk_index.pull_external_index",
    autoretry_for=(ProviderRateLimitError, ProviderResponseError),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=4,
)
def pull_external_index(self, region: str, source: str) -> bool:
    """Pull one external risk index; persist with idempotent dedup."""
    from spray.lake import emit_event
    from spray.models import ExternalRiskIndex
    from spray.providers.registry import get_external_risk

    provider = get_external_risk(source)
    fresh = provider.fetch_index(region)

    with transaction.atomic():
        # `bulk_create([fresh], update_conflicts=True, ...)` rather than
        # save() because the unique key dedups; this lets us refresh
        # `risk_index_value` / `raw_payload` if the same hour bucket
        # gets pulled twice (e.g. on retry after partial failure).
        ExternalRiskIndex.objects.bulk_create(
            [fresh],
            update_conflicts=True,
            update_fields=["risk_index_value", "risk_level", "raw_payload"],
            unique_fields=["region", "source", "pulled_at_hour"],
        )

    emit_event(
        category="external_risk_index.pulled",
        payload={
            "region": region,
            "source": source,
            "risk_index_value": (
                float(fresh.risk_index_value)
                if fresh.risk_index_value is not None
                else None
            ),
            "risk_level": fresh.risk_level,
            "pulled_at_hour": fresh.pulled_at_hour.isoformat(),
        },
    )
    logger.info(
        "pull_external_index: %s/%s = %s (%s)",
        region,
        source,
        fresh.risk_index_value,
        fresh.risk_level,
    )
    return True
