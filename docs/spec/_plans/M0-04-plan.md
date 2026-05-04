# M0-04 Plan — Data Lake Ingest

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m0/data-lake-ingest`
**PR target:** `graft-spray/main`
**Depends on:** M0-03 (PR #10) merged. M0-03 declared `DataLakeEvent` and started accumulating rows on Vineyard / Block writes; M0-04 stands up the worker tier that forwards them to S3 + Parquet and the schema registry that validates them.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §19](../Graft-Spray-App-Spec.md), §16.1 (worker tier). [`CODEBASE_PLAN.md` §6 PR #4](../CODEBASE_PLAN.md).
**Estimated diff size:** Large (~1,500 LoC + new `services/worker` package).
**Estimated effort:** 8 to 12 hours of implementation work, plus ~30 min of Benson on AWS + Render dashboard setup (S3 bucket + Render worker service + Redis instance).

---

## 1. Goal

After this PR lands:

- A new `services/worker/` Celery + Redis worker service exists in the monorepo, deployable to Render as a separate background worker.
- A **schema registry** lives at `services/api/spray/schemas/events/<category>/<event_type>/v<n>.json` (JSON Schema). Every event type Spray emits has a registered schema. CI fails any PR that adds `emit_event("foo.bar", ...)` calls without a matching schema file.
- An **ingest service** at `services/api/spray/ingest/` validates events against the registry and persists them as `DataLakeEvent` rows. The Vineyard / Block writes from M0-03 stop hand-rolling the row insert and route through `emit_event(...)` instead.
- A **Celery beat task** (`data_lake_etl.py`) runs every 15 minutes, batches new `DataLakeEvent` rows, writes them to S3 as Parquet partitioned by `org_id / category / date`, and marks them as forwarded (new `forwarded_at` column on `DataLakeEvent`).
- An S3 bucket per environment (`graft-spray-lake-prod`, `graft-spray-lake-dev`) with KMS-managed encryption at rest and per-org prefix isolation.
- CI gains a `schema-registry-check` job that scans the codebase for `emit_event` call sites and verifies each matches a registered schema.
- Tests (~50 new): schema registry validation, ingest endpoint, S3 writer (against `moto`-mocked S3), forwarding marks rows correctly, idempotent re-run does not duplicate.

This PR does NOT yet wire:
- Iceberg or Delta Lake metadata layer — M0-04a (a follow-up). M0-04 ships raw partitioned Parquet; the catalog layer lands once we have multiple downstream readers.
- Feature store (Feast) — M1+ when ML training jobs need it.
- Active-learning queue — M1-09 when capture lands.
- Audit-log S3 bucket — M0-08 (security hardening).
- EU data-residency partitioning — M3.

## 2. Decisions locked from spec

| Topic | Resolution | Source |
|---|---|---|
| Lake format | Apache Parquet (partitioned files in S3); Iceberg metadata layer deferred to M0-04a | §19.2, this plan §7 |
| Object store | AWS S3 (vs Cloudflare R2 — picked S3 for `boto3` ecosystem familiarity; R2 swap is one env-var change) | §16.1 |
| Worker | Celery 5.x + Redis 7.x (managed Redis on Render, $10/mo) | §16.1 |
| Schema | JSON Schema (vs Avro — JSON Schema reads cleaner in PRs and `jsonschema` is one Python package) | This plan §6 |
| Forwarding cadence | Every 15 min via Celery beat. Configurable; 15 min is the spec's unstated default and balances "near-real-time" with "batched-enough-for-Parquet-efficiency". | This plan §8 |
| Partitioning | `s3://graft-spray-lake-<env>/<org_id>/<category>/<yyyy-mm-dd>/<batch_uuid>.parquet` | §19.2 |
| Encryption | S3 SSE-KMS with environment-scoped CMK; Render worker connects via IAM role (M0-04 manual: cut an IAM user; full IAM-role setup at M0-08) | §17.1, this plan §3 |
| Per-org isolation | S3 prefix per org_id; bucket-policy denies cross-prefix list / get | §17.2 |
| Idempotency | `DataLakeEvent.forwarded_at` is set only after S3 PUT confirms; re-runs skip already-forwarded rows | This plan §8 |

## 3. Pre-flight checklist (Benson, manual)

These get captured / confirmed before merge:

- [ ] AWS account exists. If not, sign up (graftsystems@gmail.com is the canonical owner). Free tier is fine for M0; spec budget is ~$5/mo for S3 through M1.
- [ ] AWS S3 bucket `graft-spray-lake-dev` created in `us-west-2`. Versioning ON. Public access fully blocked. Default encryption: SSE-KMS with the auto-created `aws/s3` key (we cut a dedicated CMK in M0-08).
- [ ] AWS IAM user `graft-spray-worker` created with `AmazonS3FullAccess` scoped to the bucket. Access key + secret captured (we'll paste them into Render).
- [ ] Render Redis instance provisioned (Render dashboard → New → Key Value → choose `redis` plan, $10/mo).
- [ ] Render Background Worker service provisioned for `services/worker/` (Render → New → Background Worker → connect repo → root `services/worker`).
- [ ] Five env vars set on the new worker service: `DATABASE_URL` (same Postgres as the API), `CELERY_BROKER_URL` (Render Redis URL), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `LAKE_BUCKET=graft-spray-lake-dev`.
- [ ] CHANGELOG.md updated with M0-04 entry.
- [ ] CODEBASE_PLAN.md PR #4 row flipped to ready-for-merge.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change.

### Step 2: `services/worker/` scaffold

```
services/worker/
  graft_worker/
    __init__.py
    celery.py        # Celery app definition
    settings.py      # Pulls DATABASE_URL, CELERY_BROKER_URL, AWS_*, LAKE_BUCKET
  tasks/
    __init__.py
    data_lake_etl.py # The forwarding task
  Procfile           # Render worker entrypoint: `celery -A graft_worker worker -B -l info`
  requirements.txt   # celery[redis], boto3, pyarrow, jsonschema, django (for ORM access)
  README.md
```

The worker shares the Django ORM with the API by importing `spray.models` directly — no separate database client. Render runs both the API and the worker against the same Postgres.

### Step 3: Schema registry

`services/api/spray/schemas/events/` becomes the registry root. Initial schemas for the events M0-03 already emits:

```
events/
  vineyard/
    created/v1.json
    updated/v1.json
    archived/v1.json
  block/
    created/v1.json
    updated/v1.json
    archived/v1.json
```

Each schema is a JSON Schema document like:

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "$id": "vineyard.created.v1",
  "type": "object",
  "required": ["vineyard_id", "name"],
  "properties": {
    "vineyard_id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 200 }
  },
  "additionalProperties": false
}
```

A `services/api/spray/schemas/registry.py` module loads all schemas at startup, indexes by `<category>.<event_type>.v<n>`, and exposes a `validate(category, payload, version=None) -> None` function that raises `SchemaValidationError` on miss.

### Step 4: `emit_event()` helper

`services/api/spray/lake.py` (new):

```python
def emit_event(
    *,
    category: str,
    payload: dict,
    org: Org | None = None,
    user: User | None = None,
    schema_version: str = "1",
) -> DataLakeEvent:
    """Validate payload against registered schema, then create the row."""
    registry.validate(category=category, payload=payload, version=schema_version)
    return DataLakeEvent.objects.unscoped().create(
        org=org,
        user=user,
        category=category,
        schema_version=f"v{schema_version}",
        payload=payload,
    )
```

The M0-03 `_emit_lake_event(...)` helper in `services/api/spray/views.py` is rewritten to call `emit_event(...)` so the schema-registry validation kicks in retroactively for every existing emit site.

### Step 5: `forwarded_at` column on DataLakeEvent

A small migration (`0004_datalakeevent_forwarded_at`) adds:

```python
forwarded_at = models.DateTimeField(null=True, blank=True)
```

with a partial index `(category, created_at)` filtered to `forwarded_at IS NULL` so the worker's "find unforwarded events" query stays fast as the lake grows.

### Step 6: CI schema-registry check

`scripts/check_event_schemas.py` (new):

- Greps the codebase for `emit_event(category=...)` call sites.
- For each unique category found in code, confirms a `services/api/spray/schemas/events/<category>/<event_type>/v1.json` file exists.
- Prints all unmatched categories and exits non-zero if any.

`.github/workflows/ci.yml` adds a step:

```yaml
- name: Schema registry check
  run: python scripts/check_event_schemas.py
```

Runs on every PR. Hard requirement (no `continue-on-error`).

### Step 7: S3 Parquet writer

`services/worker/graft_worker/lake_writer.py`:

- Pulls a batch of `DataLakeEvent` rows where `forwarded_at IS NULL`, ordered by `created_at`, batched by `(org_id, category, date)`.
- For each batch, builds an Arrow Table from the rows, writes a Parquet file to `s3://<bucket>/<org_id>/<category>/<yyyy-mm-dd>/<batch_uuid>.parquet`.
- On successful PUT, updates the rows' `forwarded_at` in a single transaction.
- Idempotent: if the worker crashes between PUT and the DB update, the rows stay unforwarded and the next run picks them up; the previous Parquet file becomes orphaned (cleanup task in M0-08).

Uses `boto3` for S3 and `pyarrow` for Parquet.

### Step 8: Celery beat schedule

`services/worker/graft_worker/celery.py`:

```python
app.conf.beat_schedule = {
    "data-lake-etl": {
        "task": "graft_worker.tasks.data_lake_etl.forward_pending_events",
        "schedule": 900.0,  # every 15 minutes
    },
}
```

A management command `python services/worker/manage.py forward_now` triggers a one-shot run for testing and operational triage.

### Step 9: Tests

`services/api/spray/tests/test_emit_event.py`:
- Valid payload: row created.
- Missing required field: `SchemaValidationError`, no row created.
- Unknown category: error.

`services/api/spray/tests/test_schema_registry.py`:
- Registry loads all schemas at startup.
- Each registered schema validates against itself with a fixture payload.
- `additionalProperties: false` is set on every schema (defensive: catches drift).

`services/worker/tests/test_lake_writer.py` (new test directory; uses `moto[s3]` to mock S3):
- Forwards a batch of rows: row count in Parquet == row count in DB.
- Marks rows as `forwarded_at` after successful PUT.
- Crash before DB update: rows stay unforwarded, re-run completes.
- Per-org partitioning: two orgs' rows land in two prefix paths.

`services/worker/tests/test_beat_schedule.py`:
- Beat config registered, task discoverable.

### Step 10: CHANGELOG + docs + plan-doc updates

- CHANGELOG.md gains the M0-04 entry.
- CODEBASE_PLAN.md PR #4 row updated.
- `docs/runbooks/m0-04-data-lake.md` (new) covers AWS S3 setup, IAM scoping, Render worker provisioning, smoke-test commands (`python services/worker/manage.py forward_now`).
- `services/worker/README.md` covers local dev (`docker compose up redis`, `celery -A graft_worker worker -B -l info`).

### Step 11: Verification before merge

- [ ] Local: `docker compose up -d redis postgres`, then `python services/worker/manage.py forward_now` round-trips a fixture event into a local LocalStack S3 (or `moto`).
- [ ] CI: schema-registry check passes; pytest suites for both `services/api/spray/tests/` and `services/worker/tests/` green.
- [ ] Render: worker service deployed, beat schedule visible in Render logs, no error spam after 15 min.
- [ ] AWS: S3 bucket has at least one Parquet file under a real `<org_id>` prefix after a manual `vineyard.created` emit.
- [ ] CHANGELOG + plan-doc rows updated.

## 5. Rollback plan

| Symptom | Fix |
|---|---|
| Worker crashes on every event | Stop the Render worker service (Render dashboard → suspend). DataLakeEvent rows continue accumulating in Postgres safely; nothing is lost. Diagnose, fix, redeploy. |
| Schema-registry CI rejects valid PRs | Add the missing schema file in the same PR; CI re-runs cleanly. |
| S3 PUT failures (IAM, bucket policy) | Worker retries via Celery retry policy (3 attempts with exponential backoff). After max retries, the task fails and rows stay unforwarded. Fix IAM, redeploy worker, run `forward_now` to drain the backlog. |
| Parquet schema drift breaks downstream readers | Backward compatibility is enforced at the JSON Schema level (no removed required fields). If something slips through, write a one-off backfill script that re-emits the corrupted partition. |

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R34** (NEW) | S3 IAM key leaks (long-lived credentials in env vars) | Medium | High | Short-term acceptable; M0-08 swaps to IAM role assumption via Render's OIDC integration. Documented in runbook. |
| **R35** (NEW) | Worker falls behind, DataLakeEvent table grows unbounded | Low | Medium | Cron monitor on `MAX(created_at - forwarded_at)`; alerts at 1 hour lag. M0-08 wires Sentry for this. |
| **R36** (NEW) | Schema drift (additive change to a payload that downstream readers reject) | Medium | Low | JSON Schema enforces backward compat at PR time; CI fails on type narrowing or removed required fields. |
| **R37** (NEW) | Parquet partitioning produces too many small files (S3 cost balloon) | Low | Low | 15-min batching gives ~96 files/day per org/category. Compact-and-rewrite cron lands in M0-04a if it becomes a problem. |
| **R38** (NEW) | Cross-org leak via mis-set `org_id` in `emit_event` payload | Low | High | Schema validation ensures `org_id` matches the row's tenant. Worker also asserts `event.org_id == row.org.id` before write. RLS on DataLakeEvent (from M0-03) is the last-line defense. |

## 7. Open questions for Benson

1. **Iceberg vs raw Parquet at M0-04.** Raw Parquet is faster to ship, sufficient for a single downstream reader (the M1+ training pipelines). Iceberg adds a metadata layer (snapshots, schema evolution, time-travel) that pays off when multiple readers / writers exist. Default if silent: ship raw Parquet now, add Iceberg in M0-04a once we actually have multiple readers. Override only if you want Iceberg from day one.

2. **AWS region.** Default `us-west-2` (Oregon). Closest to California vineyards; cheapest US region. Override if you want `us-east-1` (Virginia) for proximity to East Coast users or other reasons.

3. **15-min vs hourly batching.** 15 min keeps lake near-real-time at the cost of more S3 PUT requests (~96/day per org/category). Hourly cuts cost but introduces latency for any future "time since last event" feature. Default: 15 min. Override if you want hourly.

4. **Bucket naming.** `graft-spray-lake-dev` and `graft-spray-lake-prod` follow a clean convention. AWS bucket names are global, so they need to be unique across all AWS accounts. If those names are taken, fall back to `graft-spray-lake-<random-suffix>-<env>`. Default: try the clean name first.

5. **S3 free tier vs paid.** AWS free tier covers 5 GB / 20k GET / 2k PUT for the first 12 months. Beyond that, ~$0.023/GB/month. M0-04 traffic is well within free tier through M1. Default: rely on free tier; flag billing once we cross 50% utilization.

If silent on all five, defaults apply.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 worker scaffold | 1h |
| 3 schema registry + initial schemas | 1h |
| 4 emit_event helper + M0-03 callsite refactor | 0.5h |
| 5 forwarded_at migration | 0.25h |
| 6 CI schema-registry check | 1h |
| 7 S3 Parquet writer | 2h |
| 8 Celery beat | 0.5h |
| 9 tests | 2.5h |
| 10 docs / CHANGELOG | 0.5h |
| 11 verification | 1h |
| **Total** | **~10h** |

## 9. Dependencies for downstream PRs

- **M0-05 (maps + polygon draw)** is independent — does not depend on M0-04.
- **M0-06 (weather adapter)** depends on the worker tier from M0-04. Weather pulls run as Celery tasks per spec §11.
- **M0-06b (SA-1 external risk index)** depends on the worker tier — similar.
- **M1-09 (capture)** depends on lake forwarding for image metadata.

This PR unblocks all of M0-06, M0-06b, and the eventual training pipelines.
