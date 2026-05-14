# Codebase Map

Where things live + the abstractions to understand before changing anything.

## Top-level layout

```
graft-website/
├── apps/web/                          Next.js 15 frontend (Vercel)
├── services/api/                      Django + DRF backend (Render)
├── services/worker/                   Celery worker (Render)
├── packages/                          Shared TS packages (ui, eslint-config, tsconfig, client-core)
├── infra/dev/                         docker-compose.yml for local Postgres + Redis
├── docs/spec/                         Spec + plans + diagrams (canonical product source of truth)
├── docs/research/                     Research dossier (7 categories, 405 sources)
├── docs/runbooks/                     Operational runbooks (per milestone)
├── docs/handoff/                      Snapshot handoff folders (this one)
├── render.yaml                        Render service config
├── CHANGELOG.md                       Squash-merge log
└── CONTRIBUTING.md                    Two-track workflow + conventions
```

## Backend layout (`services/api/`)

```
services/api/
├── graft_api/                         Django project (settings, urls, wsgi)
│   ├── settings.py                    All env-driven config lives here
│   └── urls.py                        Mounts /api/spray/ + /admin/
├── api/                               Legacy "PredictionTool" app (M0-era; unrelated to spray)
└── spray/                             Where 99% of business logic lives
    ├── models.py                      All Django models (Org, User, Membership, Vineyard, Block, WeatherStation, WeatherObservation, ExternalRiskIndex, Capture, RiskRecord, BlockVerdict, IntegrationConnection, SensorStation, SensorReading, OAuthState, DataLakeEvent, AuthEvent, ConsentRecord, Session)
    ├── views.py                       All DRF views (~2k lines; ordered by milestone)
    ├── urls.py                        Per-app URL routing
    ├── serializers.py                 DRF serializers (one per externally-exposed model)
    ├── permissions.py                 Five DRF permission classes (IsAuthenticatedSpray, IsOrgViewer, IsOrgMember, IsOrgAdmin, IsOrgOwner)
    ├── managers.py                    OrgScopedManager + OrgScopedQuerySet (READ THIS BEFORE QUERYING ANYTHING)
    ├── middleware.py                  CurrentOrgMiddleware: sets app.current_org_id + app.current_user_id GUCs per request
    ├── signals.py                     Block save/delete → recompute Vineyard.centroid
    ├── apps.py                        Wires signals
    ├── lake.py                        emit_event() - every business event goes through schema validation here
    ├── imagery.py                     S3 presigned-POST + HEAD helpers for capture upload
    ├── auth/clerk.py                  ClerkJWTAuthentication (DRF auth class)
    ├── aggregation/                   M1.5 aggregation engine
    │   ├── runners/                   ModelRunner Protocol + 3 concrete runners
    │   │   ├── base.py
    │   │   ├── registry.py            decorator-based @register_runner
    │   │   ├── gubler_thomas.py       UC Davis Powdery Mildew Risk Index 2013
    │   │   ├── caffi_primary.py       Caffi 2009 primary infection downy mildew
    │   │   └── caffi_secondary.py     Caffi 2010 secondary infection
    │   ├── severity_anchors.py        Three anchor functions per spec §11A.4
    │   ├── ensemble.py                equal_weight_soft_vote() → BlockVerdict dict
    │   └── audit.py                   compute_audit_hash() sha256:hex64
    ├── providers/                     External read-only feeds (Visual Crossing, UC IPM, uspest)
    │   ├── base.py                    WeatherProvider + ExternalRiskIndexProvider Protocols + exceptions
    │   ├── registry.py
    │   ├── visual_crossing.py
    │   ├── uc_ipm_grape_pm.py
    │   ├── uspest_grape_pm.py
    │   └── generic_csv.py
    ├── connectors/                    Vendor APIs the customer authenticates against
    │   ├── base.py                    SensorConnector Protocol + ConnectorHealth + exceptions
    │   ├── credentials.py             Fernet wrapper (encrypt/decrypt_token_blob + redact)
    │   ├── registry.py
    │   └── sensors/
    │       ├── pessl/                 OAuth 2.0 partner-app flow
    │       ├── davis/                 Two-key paste auth
    │       └── meter/                 Bearer-token paste + HMAC-validated webhook
    ├── recommendation/                M1.5 PR-F + PR-F.5 daily-brief stack
    │   ├── citations.py               sources_master.csv lookup
    │   ├── daily_brief.py             Deterministic renderer (PR-F floor)
    │   ├── llm_brief.py               Anthropic Claude wrapper (PR-F.5)
    │   ├── verifier.py                P-Cite + hallucination guard
    │   ├── orchestrator.py            Picks LLM-or-fallback + cache
    │   ├── pdf_audit.py               reportlab platypus composer
    │   └── prompts/daily_brief_v1.md  Pinned versioned prompt
    ├── schemas/                       JSON Schema event registry
    │   ├── registry.py                validate(category, payload, version)
    │   └── events/                    One folder per category, one v1.json per version
    ├── migrations/                    0001 through 0009 (PostGIS, RLS, sensor models, etc.)
    └── tests/                         ~310 pytest cases
```

## Worker layout (`services/worker/`)

```
services/worker/
├── graft_worker/
│   ├── celery.py                      Beat schedule lives here
│   ├── lake_writer.py                 DataLakeEvent → S3 Parquet
│   └── tasks/
│       ├── data_lake_etl.py           15-min beat → S3 Parquet
│       ├── weather_pull.py            M0-06 hourly weather + 14-day backfill
│       ├── external_risk_index.py     M0-06 hourly SA-1 indices
│       ├── aggregation_run.py         PR-C hourly aggregation engine
│       ├── sensor_pull.py             PR-E vendor-agnostic sensor poller
│       ├── pessl_pull.py              Backward-compat shim → sensor_pull
│       ├── davis_pull.py              Backward-compat shim → sensor_pull
│       └── meter_pull.py              Backward-compat shim → sensor_pull
├── manage.py                          forward_now ops triage entrypoint
└── Procfile                           Render worker process declaration
```

## Frontend layout (`apps/web/`)

```
apps/web/
├── app/                               Next.js 15 App Router
│   ├── (marketing pages)
│   ├── spray/
│   │   ├── page.tsx                   Public landing
│   │   ├── post-login/                Router after sign-in (no org → onboarding, else dashboard)
│   │   └── (app)/                     Authenticated app shell
│   │       ├── layout.tsx             SprayShell wrapper
│   │       ├── dashboard/             VerdictCard grid
│   │       ├── vineyards/
│   │       │   ├── page.tsx           List + create
│   │       │   └── [vineyard_id]/     Map + draw + block editor
│   │       ├── captures/              Photo grid
│   │       ├── integrations/
│   │       │   ├── page.tsx           Pessl + Davis + METER connect cards
│   │       │   └── [conn_id]/         Per-vendor station list + link-block
│   │       ├── recommendations/
│   │       └── onboarding/
│   ├── sign-in/                       Clerk-hosted
│   └── sign-up/                       Clerk-hosted
├── components/spray/                  SprayShell, OrgSwitcher, SprayMap, VerdictCard, PasteKeyDialog, CaptureUploader, CreateVineyardDialog
├── components/ui/                     Generic UI primitives
├── middleware.ts                      Clerk auth middleware (protects /spray/<deeper>)
├── next.config.js                     BACKEND_URL rewrites
└── __tests__/                         Vitest harness
```

## Key abstractions to know

### 1. OrgScopedManager (services/api/spray/managers.py)

Every tenant-scoped model uses `OrgScopedManager()` or `OrgScopedManager(via="<fk-path-to-org_id>")`. Iterating an unscoped queryset raises `OrgScopeRequiredError`. The escape hatch is `.unscoped()` (explicit). The right path is `.for_org(org_id)`.

**The bug PR-29 fixed:** `set_current_org_id()` uses Postgres `set_config(..., true)` which is transaction-local. Any view that calls it MUST either (a) be decorated `@transaction.atomic`, or (b) wrap the call in a `with transaction.atomic():` block. PR-29 added `@transaction.atomic` to 18 views.

### 2. Row-Level Security (migrations 0003, 0008, 0009)

PostgreSQL RLS policies live in migrations. Each tenant-scoped table has a policy filtering by `app.current_org_id::text = current_setting('app.current_org_id', true)`. The middleware sets the GUC. The OrgScopedManager is the application-layer guard; RLS is the DB-layer guard. Both exist; they belt-and-suspender each other.

Exception: `Membership` had its RLS dropped in migration 0007 - RLS filtering by org doesn't make sense for "list all orgs I belong to" queries.

### 3. SensorConnector Protocol (services/api/spray/connectors/base.py)

Three implementations: Pessl, Davis, METER. Each registers via `@register("pessl")` decorator. Worker tasks resolve via `get_connector(vendor_slug)`. Adding a 4th vendor: drop a module under `connectors/sensors/<vendor>/`, implement `list_stations`, `fetch_readings`, `health`, decorate the class, add the import in `registry.py`.

### 4. ModelRunner Protocol (services/api/spray/aggregation/runners/base.py)

Same pattern as SensorConnector. Three implementations (Gubler-Thomas, Caffi Primary, Caffi Secondary). Adding a 4th: drop a module, `@register_runner` decorate, import in `registry.py`. The ensemble engine fans out to every registered runner.

### 5. emit_event (services/api/spray/lake.py)

Every business event goes through schema validation before DB write. Schemas live in `spray/schemas/events/<group>/<event>/v<n>.json` with `additionalProperties: false`. New event = new schema file + emit_event call.

### 6. Brief orchestrator (services/api/spray/recommendation/orchestrator.py)

The public entry point for the daily brief. Picks LLM-or-fallback. The fallback path is the deterministic template; the LLM path requires verifier approval. Every render emits a `brief.rendered.v1` event with token + latency telemetry.

## What to read first when you start

1. `docs/spec/Graft-Spray-App-Spec.md` §11A, §12A, §13B (the SA-2 pivot sections).
2. `docs/spec/_plans/M1.5-PR-C-plan.md` (aggregation engine).
3. `services/api/spray/managers.py` (the manager pattern).
4. `services/api/spray/aggregation/runners/base.py` + `gubler_thomas.py` (canonical runner shape).
5. `services/api/spray/views.py` lines 1248–1430 (verdict + brief + audit PDF endpoints).
