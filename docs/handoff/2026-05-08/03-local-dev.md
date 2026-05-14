# Local Dev Setup

Getting Graft Spray running on your laptop end to end.

## One-time prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ | Next.js 15 frontend |
| pnpm | 9+ | monorepo workspace manager |
| Python | 3.13.x | Django + Celery |
| Docker Desktop | latest | local Postgres + PostGIS + Redis |
| Git LFS | latest | research datasets (rare, but the repo declares LFS patterns) |
| AWS CLI (optional) | 2.x | only if you need to test S3 paths locally |

On macOS:
```
brew install node pnpm python@3.13 docker git-lfs
```

On Windows:
- Node + pnpm via the [pnpm Windows installer](https://pnpm.io/installation)
- Python 3.13 via the python.org installer
- Docker Desktop via docker.com

## Clone + bootstrap

```
git clone --recursive https://github.com/Graft-Systems/GraftWebsite.git
cd GraftWebsite
git checkout graft-spray/main
pnpm install                          # frontend deps
cd services/api
python -m venv .venv
.venv/Scripts/activate                # Windows; on macOS: source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

The `--recursive` flag pulls the `services/api/PredictionTool` submodule (an old experiment that's still vendored; leave it alone).

## Start the supporting services

The monorepo ships an `infra/dev/docker-compose.yml` with Postgres + PostGIS + Redis:

```
cd infra/dev
docker compose up -d
```

This stands up:
- `postgis/postgis:16-3.4` on `localhost:5432`, db `graft_spray`, user `graft`, password `graft`
- `redis:7-alpine` on `localhost:6379`

Wait ~10 seconds for both to be healthy (`docker compose ps`).

## Configure env vars

Create `services/api/.env` with at minimum:

```
DJANGO_SECRET_KEY=any-dev-string-will-do
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:3000
DATABASE_URL=postgis://graft:graft@localhost:5432/graft_spray

# Required to boot Django without Clerk errors (paste real values from Benson's secrets doc)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
CLERK_FRONTEND_API=...
CLERK_JWKS_URL=...

# Required for any sensor-connector work
SPRAY_INTEGRATION_FERNET_KEY=<generate locally; can be different from prod>

# Optional - system runs without these but features degrade
VISUAL_CROSSING_API_KEY=
ANTHROPIC_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Generate a local Fernet key:
```
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

For the frontend, create `apps/web/.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
BACKEND_URL=http://localhost:8000
```

## Migrate the database

```
cd services/api
python manage.py migrate
```

This runs 0001 through 0009. Migration 0001 enables `postgis` + `postgis_topology`; 0003 enables RLS policies; 0009 adds the sensor-connector tables.

If you see `ERROR: extension "postgis" must be installed as a superuser`, your docker-compose Postgres container is healthy but the extension install failed. Recreate the container with:

```
docker compose down -v && docker compose up -d
```

The `postgis/postgis` image installs the extension at first boot.

## Run the API

```
cd services/api
python manage.py runserver 0.0.0.0:8000
```

Hit http://localhost:8000/api/spray/ - should 404 (no root view) which is correct. Browse Django admin at http://localhost:8000/admin/ after creating a superuser:

```
python manage.py createsuperuser
```

## Run the worker

In a second terminal:

```
cd services/worker
celery -A graft_worker worker -l info -B
```

The `-B` flag runs Beat in-process, which is fine for local dev. In prod, Beat is a separate Render service. The worker shares the API's Python venv via the requirements.txt at `services/api/`.

## Run the frontend

In a third terminal:

```
pnpm --filter web dev
```

Frontend at http://localhost:3000. Marketing site is public; `/spray/*` is auth-gated.

## Run the tests

Python:
```
cd services/api
pytest spray/tests/ -v
```

The current test count is ~310 across the spray app. Some tests are slow because they exercise real Postgres + PostGIS (no SQLite fallback for spatial fields).

Frontend (Vitest):
```
pnpm --filter web test
```

11 web tests at last count.

## What to expect when you run

- `python manage.py check` should pass cleanly.
- First Django runserver boot will take ~3 seconds (PostGIS adds a bit of overhead).
- The worker's Beat schedule fires `weather-pull`, `external-risk-index-pull`, `aggregation-run`, `pessl-pull`, `davis-pull`, `meter-pull`, `data-lake-etl` on their respective cadences. Most no-op when no data is present.
- The aggregation run logs `out-of-season; skipping` if you run outside April–October UTC (it's an early-season guard).

## Reset everything

```
docker compose down -v
docker compose up -d
cd services/api && python manage.py migrate && python manage.py createsuperuser
```

Drops + recreates the database from scratch.

## Known dev gotchas

- The PredictionTool submodule (`services/api/PredictionTool`) has a dirty working tree by design. Leave it alone. If `git status` complains, it's harmless.
- `docs/research/assets/*/datasets/**` is Git LFS. `git lfs install` once after clone if you need any of the datasets.
- Windows: long file paths in pnpm node_modules can hit the 260-char limit. Enable long paths via `git config --system core.longpaths true` and Windows registry `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`.
