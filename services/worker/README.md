# services/worker

Celery + Redis worker tier for Graft Spray (M0-04 onward).

## Tasks

| Task | Schedule | Lands in |
|---|---|---|
| `graft_worker.tasks.data_lake_etl.forward_pending_events` | every 15 min | M0-04 |
| `graft_worker.tasks.weather_pull.fetch` | hourly | M0-06 |
| `graft_worker.tasks.external_risk_index.aggregate` | hourly | M0-06b |
| `graft_worker.tasks.risk_index.recompute` | daily | M1-07/08 |
| `graft_worker.tasks.notification_dispatch.send` | on-demand | M1-16 |

Only `data_lake_etl` is wired at M0-04. The rest land in their respective milestones.

## Local dev

```sh
# 1. Start Redis + Postgres
cd ../../infra/dev
docker compose up -d

# 2. Install worker deps (uses services/api's deps transitively)
cd ../../services/worker
python -m venv .venv && .venv\Scripts\activate    # Windows
# python -m venv .venv && source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# 3. Apply Django migrations from the API side
cd ../api
python manage.py migrate

# 4. Run the worker (foreground)
cd ../worker
celery -A graft_worker worker -B -l info --concurrency=1
```

## One-shot ops triage

```sh
# Forward pending DataLakeEvent rows to S3 right now (bypasses Celery beat).
python services/worker/manage.py forward_now
```

## Render deploy

1. Render dashboard → New → Background Worker → connect this repo
2. Root directory: `services/worker`
3. Build command: `pip install -r requirements.txt`
4. Start command: `celery -A graft_worker worker -B -l info --concurrency=2`
5. Env vars (all required):
   - `DATABASE_URL` — same as the API service
   - `CELERY_BROKER_URL` — internal URL of the Render Redis instance
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `LAKE_BUCKET` — e.g. `graft-spray-lake-prod`
   - `AWS_REGION` — defaults to `us-west-2`

The worker shares the Postgres database with the API; no separate DB.

## Adding a new event

1. Pick a category name: `<group>.<event>` (e.g. `recommendation.served`).
2. Add a JSON Schema at `services/api/spray/schemas/events/<group>/<event>/v1.json`.
3. Call `from spray.lake import emit_event; emit_event(category="...", payload={...}, org=org, user=user)` wherever the event happens.
4. CI's `scripts/check_event_schemas.py` will fail the PR if the schema is missing.

## Known limitations (will fix)

- Long-lived AWS credentials (M0-08 swaps to IAM role assumption).
- No Sentry alerting on backlog growth (M0-08).
- No Iceberg metadata layer; readers parse partitioned Parquet directly (M0-04a).
