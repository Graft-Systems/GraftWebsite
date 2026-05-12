"""Aggregation engine Celery task — M1.5 PR-C, spec §11A.

Beat fires `compute_all_active_blocks` hourly during in-season months
(April–October UTC). The task fans out one `compute_block_verdict`
per active Block; each runner emits a `RiskRecord` against the last
24h weather window, the ensemble fuses them into a `BlockVerdict`,
and both layers emit lake events.

Idempotency: `(block, model_id, valid_from)` is unique on RiskRecord,
`(block, date)` is unique on BlockVerdict. Re-running the same window
upserts via `update_conflicts=True`.

Year-0 limitations
- Forecast is a placeholder flat-line (PR-G + forecast windows fix this)
- Sensor + advisory inputs aren't routed in yet (PR-D/E/H)
- Equal-weight soft vote only (Year-1 weights, Year-2 stacking later)
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


# Configurable via env so a dev or staging deploy can crank the cadence
# down without redeploying. Production default = hourly.
AGGREGATION_CADENCE_SEC = int(os.environ.get("GRAFT_SPRAY_AGGREGATION_CADENCE_SEC", "3600"))

# In-season months (UTC). Napa/Sonoma growing season is April–October.
# Outside this window beats fire but the task no-ops at the source.
IN_SEASON_MONTHS = set(range(4, 11))


@shared_task(name="graft_worker.tasks.aggregation_run.compute_all_active_blocks")
def compute_all_active_blocks() -> int:
    """Fan out per-block verdict tasks for every live block in-season."""
    from spray.models import Block

    now_utc = datetime.now(tz=timezone.utc)
    if now_utc.month not in IN_SEASON_MONTHS:
        logger.info(
            "compute_all_active_blocks: out-of-season (%s); skipping",
            now_utc.month,
        )
        return 0

    qs = Block.objects.unscoped().filter(archived_at__isnull=True)
    count = 0
    for block_id in qs.values_list("id", flat=True).distinct():
        compute_block_verdict.delay(str(block_id))
        count += 1
    logger.info("compute_all_active_blocks: fanned out %d tasks", count)
    return count


def _build_weather_window(block_id, target_date):
    """Build the last 24h disease-model weather window for the block."""
    from datetime import datetime as dt
    from spray.aggregation.weather import build_block_weather_window
    from spray.models import Block

    block = Block.objects.unscoped().select_related("vineyard").get(id=block_id)
    valid_to = dt.combine(target_date, dt.max.time(), tzinfo=timezone.utc)
    valid_from = valid_to - timedelta(hours=24)
    return build_block_weather_window(
        block=block,
        valid_from=valid_from,
        valid_to=valid_to,
    )


@shared_task(
    bind=True,
    name="graft_worker.tasks.aggregation_run.compute_block_verdict",
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def compute_block_verdict(self, block_id: str, target_date_iso: str | None = None) -> bool:
    """Run all registered model runners for one block, fuse, persist, emit."""
    from spray.aggregation.ensemble import equal_weight_soft_vote
    from spray.aggregation.runners.registry import (
        all_runner_versions,
        known_slugs,
        get_runner,
    )
    from spray.lake import emit_event
    from spray.models import Block, BlockVerdict, RiskRecord

    target_date = (
        date.fromisoformat(target_date_iso)
        if target_date_iso
        else datetime.now(tz=timezone.utc).date()
    )

    try:
        block = Block.objects.unscoped().select_related("vineyard").get(id=block_id)
    except Block.DoesNotExist:
        logger.warning("compute_block_verdict: block %s vanished", block_id)
        return False
    if block.archived_at is not None:
        return False

    window = _build_weather_window(block_id, target_date)
    risk_results = []
    for slug in known_slugs():
        runner = get_runner(slug)
        try:
            risk_results.append(runner.compute(window))
        except Exception:  # noqa: BLE001
            logger.exception("runner %s failed for block %s", slug, block_id)

    if not risk_results:
        logger.info("compute_block_verdict: no runner output for %s", block_id)
        return False

    # Persist RiskRecords (upsert).
    rr_rows = [
        RiskRecord(
            block=block,
            model_id=r.model_id,
            model_version=r.model_version,
            valid_from=r.valid_from,
            valid_to=r.valid_to,
            pathogen=r.pathogen,
            severity_1_10=r.severity_1_10,
            raw_score=r.raw_score,
            thresholds_fired=[
                {"name": t.name, "citation_id": t.citation_id}
                for t in r.thresholds_fired
            ],
            input_snapshot_id=r.input_snapshot_id,
            confidence=r.confidence,
            citation_id=r.citation_id,
        )
        for r in risk_results
    ]

    with transaction.atomic():
        RiskRecord.objects.unscoped().bulk_create(
            rr_rows,
            update_conflicts=True,
            update_fields=[
                "model_version",
                "valid_to",
                "pathogen",
                "severity_1_10",
                "raw_score",
                "thresholds_fired",
                "input_snapshot_id",
                "confidence",
                "citation_id",
            ],
            unique_fields=["block", "model_id", "valid_from"],
        )

    # Emit one lake event per RiskRecord.
    for r in risk_results:
        try:
            emit_event(
                category="risk_record.emitted",
                payload=r.to_event_payload(),
                org=block.vineyard.org,
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit_event risk_record failed for %s", r.model_id)

    # Ensemble fuse → BlockVerdict.
    verdict_payload = equal_weight_soft_vote(
        block_id=str(block_id),
        target_date=target_date,
        risk_records=risk_results,
    )

    with transaction.atomic():
        BlockVerdict.objects.unscoped().update_or_create(
            block=block,
            date=target_date,
            defaults={
                "powdery_severity_1_10": verdict_payload["powdery_severity_1_10"],
                "downy_severity_1_10": verdict_payload["downy_severity_1_10"],
                "powdery_confidence": verdict_payload["powdery_confidence"],
                "downy_confidence": verdict_payload["downy_confidence"],
                "action": verdict_payload["action"],
                "urgency": verdict_payload["urgency"],
                "drivers": verdict_payload["drivers"],
                "split_summary": verdict_payload["split_summary"],
                "forecast_7d": verdict_payload["forecast_7d"],
                "advisory_events": verdict_payload["advisory_events"],
                "model_versions": verdict_payload["model_versions"],
                "generated_at": verdict_payload["generated_at"],
                "audit_hash": verdict_payload["audit_hash"],
            },
        )

    try:
        emit_event(
            category="block_verdict.generated",
            payload=verdict_payload,
            org=block.vineyard.org,
        )
    except Exception:  # noqa: BLE001
        logger.exception("emit_event block_verdict failed for %s", block_id)

    logger.info(
        "compute_block_verdict: %s %s action=%s urgency=%s pow=%s down=%s",
        block_id,
        target_date,
        verdict_payload["action"],
        verdict_payload["urgency"],
        verdict_payload["powdery_severity_1_10"],
        verdict_payload["downy_severity_1_10"],
    )
    return True
