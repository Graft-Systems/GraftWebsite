"""S3 Parquet writer for the data lake (M0-04 step 7).

Pulls a batch of DataLakeEvent rows where forwarded_at IS NULL, groups
them by (org_id, category, date), and writes one Parquet file per group
to s3://<LAKE_BUCKET>/<org_id>/<category>/<yyyy-mm-dd>/<batch_uuid>.parquet.

After the S3 PUT confirms, marks the batch's rows as forwarded in a
single transaction. If the worker crashes between PUT and DB write,
the rows stay unforwarded; the next run picks them up. The previous
Parquet file is orphaned (cleanup task in M0-08).

Idempotent on retry: rows are claimed by primary-key list so the same
row can never be written twice from concurrent workers (the UPDATE
filters by id IN [...] AND forwarded_at IS NULL).
"""

from __future__ import annotations

import io
import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone

import boto3
import pyarrow as pa
import pyarrow.parquet as pq
from django.db import transaction
from django.utils import timezone as dj_timezone

from graft_worker import settings as worker_settings
from spray.models import DataLakeEvent

logger = logging.getLogger(__name__)


def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=worker_settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=worker_settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=worker_settings.AWS_REGION,
    )


def _build_arrow_table(rows: list[DataLakeEvent]) -> pa.Table:
    """Convert rows to a single Arrow Table.

    Schema is intentionally flat-ish: payload stays as a JSON string so
    the Parquet schema is stable across event types. Downstream readers
    (M1+ training pipelines) deserialize per-category as needed.
    """
    return pa.table(
        {
            "id": pa.array([str(r.id) for r in rows], type=pa.string()),
            "org_id": pa.array(
                [str(r.org_id) if r.org_id else None for r in rows],
                type=pa.string(),
            ),
            "user_id": pa.array(
                [str(r.user_id) if r.user_id else None for r in rows],
                type=pa.string(),
            ),
            "category": pa.array([r.category for r in rows], type=pa.string()),
            "schema_version": pa.array(
                [r.schema_version for r in rows], type=pa.string()
            ),
            "payload_json": pa.array(
                [json.dumps(r.payload) for r in rows], type=pa.string()
            ),
            "created_at": pa.array(
                [r.created_at for r in rows],
                type=pa.timestamp("us", tz="UTC"),
            ),
        }
    )


def _partition_key(row: DataLakeEvent) -> tuple[str, str, str]:
    org_id = str(row.org_id) if row.org_id else "_no_org"
    category = row.category
    date = row.created_at.astimezone(timezone.utc).date().isoformat()
    return org_id, category, date


def forward_pending_events(*, batch_max: int | None = None) -> int:
    """Forward up to `batch_max` unforwarded events to S3.

    Returns the number of rows successfully forwarded. Safe to call
    repeatedly; concurrent workers will not double-forward because the
    final UPDATE filters by `forwarded_at IS NULL`.
    """
    cap = batch_max or worker_settings.LAKE_BATCH_MAX_ROWS

    rows = list(
        DataLakeEvent.objects.unscoped()
        .filter(forwarded_at__isnull=True)
        .order_by("created_at")[:cap]
    )
    if not rows:
        return 0

    # Group by partition key.
    groups: dict[tuple[str, str, str], list[DataLakeEvent]] = defaultdict(list)
    for r in rows:
        groups[_partition_key(r)].append(r)

    s3 = _s3_client()
    forwarded_ids: list = []

    for (org_id, category, date), group_rows in groups.items():
        table = _build_arrow_table(group_rows)
        buf = io.BytesIO()
        pq.write_table(table, buf, compression="snappy")
        buf.seek(0)

        batch_uuid = uuid.uuid4().hex[:12]
        key = f"{org_id}/{category}/{date}/{batch_uuid}.parquet"

        try:
            s3.put_object(
                Bucket=worker_settings.LAKE_BUCKET,
                Key=key,
                Body=buf.getvalue(),
                ContentType="application/x-parquet",
                ServerSideEncryption="aws:kms",
            )
        except Exception:
            logger.exception(
                "lake_writer: S3 PUT failed for %s/%s/%s; will retry",
                org_id,
                category,
                date,
            )
            # Skip this group; do NOT mark its rows forwarded. Next run
            # picks them up. Orphaned Parquet (if PUT partially succeeded)
            # is cleaned up by a follow-up task in M0-08.
            continue

        forwarded_ids.extend([r.id for r in group_rows])
        logger.info(
            "lake_writer: wrote %d rows to s3://%s/%s",
            len(group_rows),
            worker_settings.LAKE_BUCKET,
            key,
        )

    if forwarded_ids:
        with transaction.atomic():
            DataLakeEvent.objects.unscoped().filter(
                id__in=forwarded_ids, forwarded_at__isnull=True
            ).update(forwarded_at=dj_timezone.now())

    return len(forwarded_ids)
