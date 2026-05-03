# M0-03 Runbook — Render Postgres + PostGIS

This runbook covers the manual steps Benson takes around merging
M0-03 into `graft-spray/main`. None of these are part of the PR
itself; they are the operations work that supports it.

## 1. Upgrade Render Postgres to Pro

PostGIS only ships on Render's Pro plan and up. The free / hobby plan
does not include the extension binaries.

1. Render dashboard → graftwebsite service → **Database** tab.
2. Click **Upgrade plan** → choose **Postgres Pro** ($20/month as of 2026-04).
3. Confirm the upgrade. Render will rotate the DB instance with point-in-time
   recovery on; existing data is preserved.

This step should happen BEFORE the M0-03 merge lands on `graft-spray/main`,
so the closeout merge to `main` doesn't fail on the PostGIS extension
creation.

## 2. Confirm PostGIS extension installs

Once the Pro plan is active, the M0-03 migration `0002_postgis_vineyard_block_datalake`
runs `CREATE EXTENSION IF NOT EXISTS postgis` automatically. To confirm
manually:

```sh
# From the Render dashboard, copy the External Database URL.
psql "$RENDER_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql "$RENDER_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
psql "$RENDER_DATABASE_URL" -c "SELECT PostGIS_Version();"
```

Expected output: a version string like `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`.

If `CREATE EXTENSION` fails with `permission denied`, the default
Render Postgres user does not own the database. Ask Render support to
grant `CREATE EXTENSION` privilege, or rebuild the database via the
Render dashboard.

## 3. Verify RLS policies

After M0-03 deploys to Render, confirm the tenant-isolation policies
landed:

```sh
psql "$RENDER_DATABASE_URL" -c "
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN (
  'spray_membership',
  'spray_vineyard',
  'spray_block',
  'spray_datalakeevent'
);
"
```

Expected: every row shows both columns as `t` (true).

## 4. Local dev setup (one-time)

For developers (Benson + future collaborators) running the API
locally:

### Prerequisites

- Docker Desktop installed and running.
- Python 3.13 (already present per services/api/.python-version).
- GDAL on the host. Windows users: install via OSGeo4W; macOS: `brew install gdal`;
  Linux: `apt-get install gdal-bin libgdal-dev`. GDAL is a runtime dep of
  `django.contrib.gis`.

### First run

```sh
cd infra/dev
docker compose up -d              # starts postgres+postgis on :5432
cd ../../services/api
python -m venv .venv && source .venv/Scripts/activate   # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8080
```

To wipe the local DB and start fresh:

```sh
cd infra/dev
docker compose down -v
docker compose up -d
```

## 5. Rollback

If M0-03 breaks production:

1. Render auto-deploy can be reverted by pushing a `git revert` of the
   merge commit to `graft-spray/main`. Render redeploys from the new tip.
2. The RLS-policies migration (`0003_rls_policies`) is fully reversible:
   `python manage.py migrate spray 0002` drops the policies and disables
   RLS, restoring pre-M0-03 row visibility.
3. The schema migration (`0002_postgis_vineyard_block_datalake`) can also
   reverse — it drops Vineyard / Block / DataLakeEvent tables. The PostGIS
   extension itself is intentionally NOT dropped on reverse (drop-cascade
   would clobber spatial columns elsewhere if they ever exist).

If you need to drop PostGIS manually for any reason:

```sh
psql "$RENDER_DATABASE_URL" -c "DROP EXTENSION postgis_topology CASCADE;"
psql "$RENDER_DATABASE_URL" -c "DROP EXTENSION postgis CASCADE;"
```

This is destructive across all tables that use spatial columns. Avoid
unless you know exactly what you are doing.
