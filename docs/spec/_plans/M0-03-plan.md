# M0-03 Plan — Postgres + PostGIS Schema

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m0/postgis-schema`
**PR target:** `graft-spray/main`
**Depends on:** M0-02 (PR #6) merged. M0-02a (PR #9) merged. M0-02 created the auth + tenancy tables; M0-03 extends with the spatial entities and locks down tenant isolation at the DB layer with row-level security.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §9](../Graft-Spray-App-Spec.md), §17.2, §17.3 (RLS). [`CODEBASE_PLAN.md` §6 PR #3](../CODEBASE_PLAN.md). Open Question Q3 (PostGIS hosting on Render) RESOLVED.
**Estimated diff size:** Medium-Large (~600 LoC backend, no frontend, plus migrations).
**Estimated effort:** 5 to 7 hours of implementation work, plus ~15 minutes of Benson's time on the Render Postgres add-on.

---

## 1. Goal

After this PR lands:

- Render's managed Postgres has the `postgis` and `postgis_topology` extensions installed.
- Two new Django models live in `services/api/spray/models.py`: `Vineyard` and `Block`. Both carry `org_id` foreign keys; `Vineyard.centroid` is `geometry(Point, 4326)`; `Block.geom` is `geometry(Polygon, 4326)`.
- A new `OrgScopedManager` on every tenant-scoped model (Org-attached models from M0-02 plus the new Vineyard / Block) requires an `org_id` on read paths. Forgetting to scope a queryset raises `OrgScopeRequiredError` at query time so cross-tenant leaks are surfaced as test failures, not silent data exposures.
- PostgreSQL row-level security (RLS) policies are installed on the four tenant-scoped tables: `Membership`, `Vineyard`, `Block`, and a forward-compatible policy framework that future M0-04+ tables hook into. The Django connection sets a `app.current_org_id` session GUC on every request via DRF middleware.
- DRF endpoints for Vineyard CRUD and Block CRUD ship with permissions matching M0-02 (Owner/Admin write, Member/Viewer read).
- A test suite (~40 new tests) covers: the manager raising on unscoped queries, the RLS policy denying cross-org reads even when ORM scoping is bypassed, GIST indexes existing on the spatial columns, the API endpoints enforcing RBAC.
- A new `services/api/graft_api/db_session.py` module sets `app.current_org_id` per request based on the resolved org context (header, body, or URL kwarg, same precedence as `permissions._resolve_org_id`).

This PR does NOT yet wire the polygon-draw UI (M0-05), weather observation tables (M0-06), or any ML / capture surface (M1+). It also does not introduce Celery; data-lake event mirroring per spec §9.5 lands in M0-04.

## 2. Decisions locked from spec

| Topic | Resolution | Source |
|---|---|---|
| PostGIS host | Render Postgres Pro tier (`postgis`, `postgis_topology`, `pg_trgm`) | Spec §16.1, Q3 RESOLVED |
| Spatial reference system | EPSG:4326 (WGS84 lat/lon) | §9.1, §8.12 |
| Geom on Block | `geometry(Polygon, 4326)` | §9.1 |
| Centroid on Vineyard | `geometry(Point, 4326)`, computed from constituent Block geoms when present, else manually entered | This plan §4.3 |
| RLS strategy | Per-row `org_id` policy keyed off `app.current_org_id` GUC | §9.2, §17.2 |
| ORM enforcement | Custom `OrgScopedManager` overrides `get_queryset()` and raises if scope is missing; bypass via explicit `unscoped()` for admin paths | This plan §4.4 |
| Migration order | M0-02 auth tables (already shipped), then this PR creates extensions then Vineyard / Block | §9.4 |
| Postgres version | 16.x (Render default) | §16.1 |
| Backup cadence | Render's managed point-in-time recovery, 7-day window | §16.5 |

## 3. Pre-flight checklist

These get captured / confirmed before merge:

- [ ] Render Postgres add-on attached to the graft-api service AND Pro tier active (cost: ~$20/mo as of 2026-04). Free tier does not support PostGIS.
- [ ] `DATABASE_URL` env var on Render points at the Pro Postgres instance (not SQLite, not the old free tier).
- [ ] Local dev: developer has Postgres 16 + PostGIS 3.4 installed locally OR uses the docker compose file added in this PR.
- [ ] The 0001 auth migration from M0-02 must apply cleanly on a fresh Postgres before this PR's migrations run.
- [ ] `python manage.py migrate spray` runs cleanly on a fresh Postgres + PostGIS.
- [ ] `pytest services/api/spray/tests/` all green (existing 66 tests + ~40 new ones).
- [ ] The 66 existing M0-02 tests still pass under the new manager (any test that did `Membership.objects.filter(...)` without org scope must be updated).
- [ ] CHANGELOG.md updated with M0-03 entry.
- [ ] CODEBASE_PLAN.md PR #3 row flipped to ready-for-merge.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change. PR opens immediately, base `graft-spray/main`, marked Draft. Benson approves, then steps 2-12 land as separate commits on the same branch.

### Step 2: Switch the dev database from SQLite to Postgres

`services/api/db.sqlite3` is fine for M0-02's auth tables but cannot host PostGIS. Three changes:

- `services/api/graft_api/settings.py` — `DATABASES['default']` reads `DATABASE_URL` via `dj_database_url`. When the env var is unset (CI, local dev without docker), default to `postgres://graft:graft@localhost:5432/graft_spray`.
- `infra/dev/docker-compose.yml` (new) — a one-service compose with `postgis/postgis:16-3.4` image, named volume, port `5432:5432`. Boots in ~5 seconds via `docker compose up -d`.
- `services/api/README.md` — local-dev section gets a "first run on a fresh laptop" recipe: `docker compose up -d`, `pip install -r requirements.txt`, `python manage.py migrate`, `python manage.py runserver`.

`services/api/db.sqlite3` is deleted from the repo (it was only ever a local dev artifact).

### Step 3: Install PostGIS on Render

Render Postgres Pro supports the extension; it just needs to be enabled. The migration in step 5 runs `CREATE EXTENSION IF NOT EXISTS postgis` and `CREATE EXTENSION IF NOT EXISTS postgis_topology` as the first operation. Render's default Postgres user (`graft_db_user` or whatever the dashboard set) needs the `CREATE` privilege on the database, which is the default for the owner role.

If the migration fails with "permission denied to create extension" we manually run the two `CREATE EXTENSION` statements via Render's psql shell once, then re-run `migrate`. This contingency is documented in `docs/runbooks/m0-03-render-postgis.md` (new).

### Step 4: Add `Vineyard` and `Block` models

In `services/api/spray/models.py`:

```python
from django.contrib.gis.db import models as gis_models

class Vineyard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Org, on_delete=models.CASCADE, related_name="vineyards")
    name = models.CharField(max_length=200)
    region = models.CharField(max_length=20, choices=Org.Region.choices)
    address = models.CharField(max_length=400, blank=True)
    centroid = gis_models.PointField(srid=4326, null=True, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager()

    class Meta:
        indexes = [
            models.Index(fields=["org"]),
            gis_models.Index(name="vineyard_centroid_gist", fields=["centroid"]),
        ]


class Block(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vineyard = models.ForeignKey(
        Vineyard, on_delete=models.CASCADE, related_name="blocks"
    )
    name = models.CharField(max_length=120)
    geom = gis_models.PolygonField(srid=4326)
    variety = models.CharField(max_length=80, blank=True)
    training_system = models.CharField(max_length=80, blank=True)
    row_spacing_m = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager(via="vineyard__org")

    class Meta:
        indexes = [
            models.Index(fields=["vineyard"]),
            gis_models.Index(name="block_geom_gist", fields=["geom"]),
        ]
```

`Block.org` is reachable via `vineyard.org`; the manager declares `via="vineyard__org"` so org-scoped queries traverse the FK. `Block.row_spacing_m` is meters (Decimal so 2.13m precision is preserved without float drift).

### Step 5: Migration

`spray/migrations/0002_postgis_vineyard_block.py`:

1. `RunSQL("CREATE EXTENSION IF NOT EXISTS postgis;")` (with reverse `DROP EXTENSION postgis;` guarded behind a noop in production).
2. `RunSQL("CREATE EXTENSION IF NOT EXISTS postgis_topology;")` (same pattern).
3. `migrations.CreateModel("Vineyard", ...)`.
4. `migrations.CreateModel("Block", ...)`.
5. GIST indexes are auto-created by `gis_models.Index` so no manual SQL.

The migration is idempotent on extension creation (`IF NOT EXISTS`).

### Step 6: `OrgScopedManager`

`services/api/spray/managers.py` (new):

```python
class OrgScopeRequiredError(Exception): ...

class OrgScopedQuerySet(models.QuerySet):
    def for_org(self, org_id):
        if self.model is Membership:
            return self.filter(org_id=org_id)
        # Default field: `org_id`. Block overrides via `_org_path`.
        path = getattr(self.model, "_org_path", "org_id")
        return self.filter(**{path: org_id})

    def unscoped(self):
        # Explicit escape hatch for admin paths and webhooks.
        return self

class OrgScopedManager(models.Manager):
    def __init__(self, *, via: str = "org_id"):
        super().__init__()
        self._via = via

    def get_queryset(self):
        # Returns a queryset that requires `.for_org(...)` before iteration.
        # Calling `.all()` is allowed but iteration raises until scoped.
        ...
```

The implementation uses a `_scoped` flag on the queryset; `__iter__`, `count`, `exists`, etc. all check it. Tests assert that `Vineyard.objects.all().count()` raises `OrgScopeRequiredError` and that `Vineyard.objects.for_org(org.id).count()` does not.

Existing M0-02 code paths that read `Org`, `User`, `Session`, `AuthEvent`, `ConsentRecord` either:
- Are inherently single-tenant (User by `clerk_user_id`, Session by `clerk_session_id`) and stay on the default manager.
- Are explicitly admin/audit (`AuthEvent.objects.create(...)`) and stay on the default manager.
- Need org scope (`Membership`) and switch to `OrgScopedManager`.

### Step 7: `app.current_org_id` GUC + middleware

`services/api/graft_api/db_session.py` (new):

A small DRF middleware (or a custom DRF authentication-class extension) that, after auth resolves the user and the org context, executes `SET LOCAL app.current_org_id = '<uuid>'` on the connection for the duration of the request. The setting clears at transaction end so worker reuse is safe.

Org context is resolved by the existing `_resolve_org_id` helper from `permissions.py`, lifted to a public function and reused here.

### Step 8: RLS policies

`services/api/spray/migrations/0003_rls_policies.py`:

For each tenant-scoped table (`Membership`, `Vineyard`, `Block`):

```sql
ALTER TABLE spray_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_membership FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_org_isolation ON spray_membership
  USING (org_id::text = current_setting('app.current_org_id', true));
```

For `Block` the policy traverses: `USING ((SELECT v.org_id FROM spray_vineyard v WHERE v.id = vineyard_id)::text = current_setting('app.current_org_id', true))`.

The Django default DB user gets `BYPASSRLS` revoked. A separate `graft_admin` role retains bypass for migrations and management commands; `manage.py migrate` runs as `graft_admin`, runtime requests run as `graft_app` (no bypass).

The `app.current_org_id` GUC defaults to empty when no org context resolves, in which case the policies deny all rows. This means an authenticated user with no membership sees nothing, by construction.

### Step 9: Vineyard + Block API

Endpoints (mounted at `/api/spray/`):

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `vineyards` | `IsOrgMember` | Create a Vineyard in the active Org |
| `GET` | `vineyards` | `IsOrgViewer` | List Vineyards in the active Org |
| `GET` | `vineyards/<uuid>` | `IsOrgViewer` | Detail |
| `PATCH` | `vineyards/<uuid>` | `IsOrgMember` | Update name / region / address / centroid / settings |
| `DELETE` | `vineyards/<uuid>` | `IsOrgAdmin` | Archive (sets `archived_at`; cascade-archives child Blocks) |
| `POST` | `vineyards/<uuid>/blocks` | `IsOrgMember` | Create a Block under a Vineyard |
| `GET` | `vineyards/<uuid>/blocks` | `IsOrgViewer` | List Blocks |
| `GET` | `blocks/<uuid>` | `IsOrgViewer` | Detail |
| `PATCH` | `blocks/<uuid>` | `IsOrgMember` | Update name / variety / training / row_spacing / geom / settings |
| `DELETE` | `blocks/<uuid>` | `IsOrgAdmin` | Archive |

Each write emits a `DataLakeEvent` stub row with category `vineyard.created`, `vineyard.updated`, `block.created`, `block.updated`, `block.archived` — the actual lake forwarding wires up in M0-04 once the lake exists. For now, the rows just sit in `spray_data_lake_event` (we add this minimal model in step 10).

### Step 10: `DataLakeEvent` skeleton

A 1-table forward-declaration so M0-04 can plug in:

```python
class DataLakeEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Org, null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=80)
    schema_version = models.CharField(max_length=20)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrgScopedManager()
```

No forwarding logic; rows just accumulate. Spec §19.4 (schema-registry CI check) lands in M0-04 alongside the actual ingest pipeline.

### Step 11: Tests

Add `services/api/spray/tests/` files:

- `test_vineyard_models.py` — defaults, FK cascade-on-archive, GIST index exists on `centroid` (introspect `pg_indexes`).
- `test_block_models.py` — same for `geom`, plus polygon SRID enforcement (raises on mismatched SRID at save).
- `test_org_scoped_manager.py` — unscoped iteration raises; `for_org()` filters; `unscoped()` escape hatch works; `Block.objects.for_org(org.id)` traverses through `vineyard__org`.
- `test_rls_policies.py` — connect with the `graft_app` role, set `app.current_org_id` to org A, attempt to SELECT a row owned by org B → returns zero rows even though the row exists. Same test bypassing the manager via raw SQL.
- `test_vineyard_endpoints.py` — happy path + RBAC denial for each route.
- `test_block_endpoints.py` — same.
- `test_app_current_org_id.py` — middleware sets the GUC; cleared on transaction end.

Also extend existing M0-02 tests where the new manager changes return semantics (likely `test_org_endpoints.py` membership listing; about 5 line edits).

### Step 12: Verification before merge

- [ ] Local: `docker compose up -d` then `python manage.py migrate` clean.
- [ ] Local: `pytest services/api/spray/tests/` all green (~106 tests).
- [ ] Local: `python manage.py shell` — connect and run the RLS smoke test from `docs/runbooks/m0-03-render-postgis.md`.
- [ ] CI: build + Django check + pytest pass.
- [ ] Render: PostGIS extension installed, migrations applied (manual deploy or auto-deploy on milestone closeout).
- [ ] CHANGELOG.md updated.
- [ ] CODEBASE_PLAN.md acceptance row updated.

## 5. Rollback plan

If anything breaks after merge:

- **R1 — Migration fails on Render due to extension permission.** Manually run `CREATE EXTENSION postgis` as the Postgres owner via Render's psql, re-run `migrate`. Documented in `docs/runbooks/m0-03-render-postgis.md`.
- **R2 — RLS denies legitimate reads.** Symptom: app appears empty, Sentry fills with empty-result paths. Hotfix: the migration includes a `disable_rls.sql` companion that bulk-drops the policies; ship it via a follow-up migration if needed. Tests would catch this in CI before merge.
- **R3 — `OrgScopedManager` breaks an admin path that legitimately needs cross-tenant reads.** Use `.unscoped()` explicitly. If a hot path is missed, the test failures surface immediately.
- **R4 — Existing M0-02 tests fail under the new manager.** The 5-ish line edits in §11 cover the expected breakage; if more turn up, fix them in the same PR.

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R29** (NEW) | RLS policy denies all rows for service accounts that should bypass | Low | High | `graft_admin` role retains BYPASSRLS; migrations and management commands run as that role. Documented in runbook. |
| **R30** (NEW) | Race between `SET LOCAL app.current_org_id` and connection pooling | Medium | Medium | `SET LOCAL` clears at transaction end; Django wraps each request in a transaction. Tests verify a request without org context does not inherit the previous request's GUC value. |
| **R31** (NEW) | PostGIS extension install requires elevated privilege the default Render Postgres user lacks | Medium | Medium | Pre-flight check; runbook with manual psql fallback. Q3 says Pro tier supports it, but exact privilege model varies. |
| **R32** (NEW) | `OrgScopedManager` adds friction; new contributors forget `.for_org(...)` | Medium | Low (test failure, not silent leak) | Manager raises loudly; CI catches every missing scope at PR time. |
| **R33** (NEW) | `services/api/db.sqlite3` deletion breaks any lingering local-dev that relies on it | Low | Low | Documented in runbook; existing PR #6 dev flow already moved off SQLite for the spray app via DATABASE_URL. |

## 7. Out of scope (deferred)

- Polygon-draw UI on the marketing site — M0-05.
- WeatherStation, WeatherObservation models — M0-06.
- ExternalRiskIndex (SA-1) — M0-06b.
- DataLakeEvent forwarding to S3 — M0-04 (this PR only declares the model).
- Bulk import of Vineyards from KML / shapefile — M0-05.
- Per-block weather virtual stations (interpolated from nearest physical stations) — M0-06.
- Audit triggers making `AuthEvent` immutable at the DB level (currently application-only) — also lands in this PR's `0003_rls_policies.py` migration as a small extra (BEFORE UPDATE / DELETE triggers raise on auth_event); MOVED TO §4.8 if scope permits, else deferred.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 dev DB switch + docker compose | 0.75h |
| 3 PostGIS install on Render | 0.25h (mostly waiting) |
| 4 Vineyard + Block models | 0.5h |
| 5 migration | 0.25h |
| 6 OrgScopedManager | 1h |
| 7 GUC middleware | 0.5h |
| 8 RLS policies migration | 1h |
| 9 Vineyard + Block API | 1h |
| 10 DataLakeEvent skeleton | 0.25h |
| 11 tests (~40 new + 5 edits) | 1.5h |
| 12 verification | 0.5h |
| **Total** | **~7h** |

## 9. Open questions for Benson

None blocking. Defaults if silent:

1. **Render Postgres Pro upgrade.** This costs ~$20/month. Confirm before I tell you to upgrade in the dashboard. Default if silent: I assume yes (the spec already locked Pro tier per §16.1). I will flag the upgrade as a manual step at the start of implementation, not auto-incur the bill.
2. **`row_spacing_m` precision.** Decimal(4,2) gives 0.01m to 99.99m range. Default if silent: keep as planned. Override only if you have rows wider than 99 m.
3. **`Vineyard.archived_at` behavior on cascade.** When a Vineyard archives, do child Blocks archive too (default: yes, atomic) or stay live (no)? Default: yes (cascade archive, can be reversed with a follow-up endpoint).
4. **`graft_admin` role naming.** Cosmetic. Default: `graft_admin`. Override only if you want a different name for ops reasons.

If silent on all four, I default per the plan above.

## 10. Dependencies for downstream PRs

- **M0-04 (data-lake ingest)** depends on: `DataLakeEvent` skeleton from this PR, plus the schema-registry pattern.
- **M0-05 (maps + polygon draw)** depends on: `Block.geom` and the Block API from this PR.
- **M0-06 (weather adapter)** depends on: `Vineyard.centroid` and the spatial query path.

This PR unblocks all three.
