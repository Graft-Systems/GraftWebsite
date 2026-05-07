# Changelog

All notable changes to the Graft Systems monorepo are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with milestone-grouped entries reflecting the Graft Spray roadmap defined in [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md) section 6.

## Unreleased

### M1.5 PR-D: Pessl FieldClimate sensor connector (OAuth 2.0)

PR on `graft-spray/m1.5/sensor-pessl`. First real customer-authenticated sensor adapter. Establishes the `services/api/spray/connectors/` namespace (per CODEBASE_PLAN.md §300 — connectors are vendor APIs the customer authenticates against; providers are read-only feeds we own the auth on) and the vendor-agnostic `SensorConnector` Protocol that PR-E (Davis + METER) will reuse without API churn. OAuth flow runs end to end against `responses`-mocked Pessl fixtures; live-smoke awaits Pessl's manual partner-app approval (D1 in plan).

#### Added

- **`services/api/spray/connectors/`** package.
  - `base.py` — `SensorConnector` Protocol + `VendorStation` / `ConnectorHealth` DTOs + parallel exception classes (`ConnectorAuthError`, `ConnectorRateLimitError`, `ConnectorResponseError`) so the worker's retry policy can target the right class (mirrors `spray.providers.base`).
  - `credentials.py` — Fernet wrapper over the OAuth/refresh token blob. `encrypt_token_blob` / `decrypt_token_blob` round-trip `dict` ↔ `bytes` for `BinaryField`. `redact()` for safe-to-log dumps. Plaintext NEVER appears in logs, Sentry, `__repr__`, or any serializer field. Key sourced from `SPRAY_INTEGRATION_FERNET_KEY` env var.
  - `registry.py` — slug→class lookup, `@register("pessl")` decorator, eager-imports for the Pessl module.
- **`services/api/spray/connectors/sensors/pessl/`** package.
  - `oauth.py` — partner-app OAuth 2.0 flow: `build_authorize_url(state)`, `exchange_code(code)` (returns `{access_token, refresh_token, expires_in, vendor_account_id}`), `refresh_access_token(refresh_token)`. Maps Pessl status codes to connector exception classes; never logs response bodies (could contain secrets).
  - `client.py` — `PesslClient` HTTP wrapper. Auto-refreshes on 401 via the `on_token_refresh` callback (caller persists the rotated blob in a single `transaction.atomic()`). Endpoints: `/user`, `/user/stations`, `/data/{station}/raw/from/.../to/...`. Second 401 after refresh → `ConnectorAuthError` (refresh-token itself dead).
  - `normalizer.py` — Pessl payload → canonical-schema rows per spec §12A.3. Channel mapping by `ch` substring match (handles air_temp, humidity, leaf_wetness, precip, wind_speed across station model variants). Aggregator pick: `sum` for cumulative fields (LW + precip), `avg` for everything else. Forgiving on missing channels + malformed timestamps.
  - `connector.py` — `PesslConnector` implements the Protocol. Wraps client + normalizer; persists rotated tokens; marks the connection `needs_reauth` on auth failure.
- **Django models** (`services/api/spray/models.py`):
  - `IntegrationConnection` — org-scoped, vendor-agnostic. `(org, vendor, vendor_account_id)` unique. `BinaryField` token ciphertext + status enum (active / needs_reauth / disconnected).
  - `SensorStation` — vendor's station tied to one connection, optionally linked to many `Block`s via `SensorStationBlock` through-table (audit trail of who linked when).
  - `SensorReading` — canonical sensor schema per spec §12A.3 (air_temp_c, rh_pct, leaf_wetness_min in MINUTES, precip_mm, wind_speed_ms). `(station, ts)` unique upsert. `quality_flag` enum.
  - `OAuthState` — short-lived CSRF/state row, TTL 10 min, consumed-once at callback.
- **Migration `0009_sensor_models`** — five tables + RLS policies on the three tenant-scoped ones (`IntegrationConnection`, `SensorStation`, `SensorReading`). Reversible.
- **Celery polling** (`services/worker/graft_worker/tasks/pessl_pull.py`):
  - `pull_all_pessl_stations` (beat fires every 15 min, env-overridable via `GRAFT_SPRAY_PESSL_CADENCE_SEC`) fans out per active SensorStation linked to ≥1 Block.
  - `pull_pessl_station(station_id)` pulls readings since `station.last_seen_at` (or now-14d on first pull), `bulk_create(update_conflicts=True)` upserts, advances watermark, emits one `sensor.reading_pulled` lake event per reading. Marks readings `quality_flag = "gap_filled"` when station has been silent >4h (spec §12A.4).
- **API endpoints** (`spray/views.py` + `urls.py`):
  - `GET  /api/spray/orgs/<org>/integrations` — list connections (token blob never serialized).
  - `POST /api/spray/orgs/<org>/integrations/pessl/oauth/start` — returns `{authorize_url, state}`.
  - `GET  /api/spray/integrations/pessl/oauth/callback` — verifies state, exchanges code, encrypts blob, upserts connection, redirects to `/spray/integrations?connected=pessl` (or returns JSON when `SPRAY_FRONTEND_BASE_URL` unset).
  - `GET  /api/spray/orgs/<org>/integrations/<conn>/stations` — live-fetches + caches SensorStations.
  - `POST /api/spray/orgs/<org>/integrations/<conn>/stations/<station>/link-block` — body `{block_id}`.
  - `DELETE /api/spray/orgs/<org>/integrations/<conn>` — soft-delete (status=disconnected, historical readings preserved).
  - Permission gates: `IsOrgViewer` for list, `IsOrgAdmin` for OAuth start + disconnect, `IsOrgMember` for station ops.
- **Lake event schemas**:
  - `sensor.reading_pulled.v1.json` — per-station-pull transition (distinct from the existing `sensor_reading.ingested.v1.json` which is the per-block downstream form).
  - `integration.connected.v1.json`, `integration.disconnected.v1.json` — connection-lifecycle events. All `additionalProperties: false`.
- **Frontend** (`apps/web/`):
  - `app/spray/(app)/integrations/page.tsx` — replaces placeholder. Lists active connections with status chips, "Connect Pessl" button kicks off the OAuth start → redirect dance, soft-disconnect with confirm.
  - `app/spray/(app)/integrations/[conn_id]/page.tsx` — vendor-station list with per-station "Link to block" picker (org's vineyards × blocks).
- **Settings** (`graft_api/settings.py`):
  - `SPRAY_INTEGRATION_FERNET_KEY`, `PESSL_CLIENT_ID`, `PESSL_CLIENT_SECRET`, `PESSL_REDIRECT_URI`, `PESSL_API_BASE`, `SPRAY_FRONTEND_BASE_URL` (all env-driven, all default-empty so dev + CI run without secrets).
- **Tests** (~30 new):
  - `test_credentials.py` — Fernet round-trip, memoryview support, missing/invalid key, wrong-key decrypt failure, redact.
  - `test_pessl_normalizer.py` — full + partial + null + unknown-channel + malformed-timestamp paths.
  - `test_pessl_oauth.py` — authorize-URL shape, code exchange happy path, 400/429 mapping, refresh, missing-creds bail.
  - `test_pessl_client.py` — list_stations happy, 401→refresh→retry, double-401 fails, 429, fetch_raw_data.
  - `test_pessl_pull_task.py` — persists + emits events, idempotent on retry, gap-fill flag, skips disconnected connections.
  - `test_integration_endpoints.py` — list, OAuth start, OAuth callback (mocked exchange), expired/unknown state rejection, station list (mocked connector + upsert), link-block, disconnect, cross-org isolation.

#### Beat schedule

`pessl-pull` registered at `services/worker/graft_worker/celery.py`, default 15 min cadence.

#### Scope cuts (deferred)

- Davis WeatherLink polling adapter (PR-E).
- METER ZENTRA push webhook (PR-E).
- Sencrop OAuth (Phase 2 per spec §12A.2).
- HMAC-SHA256 single-account fallback for Pessl (lower priority; partner-app OAuth is the MVP path).
- Sensor-fed `WeatherWindow` enrichment for ensemble runners (PR-D.5 or rolled into PR-E).
- KMS-backed credential rotation (post-MVP).

#### Pre-flight (Benson, deferred)

- Pessl partner-app outreach to api@metos.at + support@fieldclimate.com to receive `client_id` + `client_secret`.
- Generate `SPRAY_INTEGRATION_FERNET_KEY` via `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
- Add to Render API + Worker env: `PESSL_CLIENT_ID`, `PESSL_CLIENT_SECRET`, `PESSL_REDIRECT_URI`, `SPRAY_INTEGRATION_FERNET_KEY`, `SPRAY_FRONTEND_BASE_URL`.

### M1.5 PR-F: recommendation card UI + deterministic daily brief

PR on `graft-spray/m1.5/recommendation-card`. Closes the loop from PR-C (verdicts persisted) to grower-visible UI: every BlockVerdict now renders as a `VerdictCard` on the dashboard, and a deterministic daily-brief endpoint surfaces a citation-anchored narrative built from the same schema-validated numbers. Per spec §13B.1, BlockVerdict IS the daily card; UI never originates or paraphrases numbers. The LLM-authored brief with hallucination guard ships in PR-F.5; this PR establishes the deterministic fallback path that PR-F.5 will fall back to on guard failure.

#### Added

- **`services/api/spray/recommendation/`** package.
  - `citations.py` — `lookup(citation_id)` + `lookup_many(...)` resolve a citation_id to its row in `docs/research/sources_master.csv`. Cached at import; no per-request CSV reads.
  - `daily_brief.py` — `render_brief(verdict)` returns a deterministic envelope `{headline, paragraphs, drivers, citations, fallback_reason, renderer}`. Headline branches on action × urgency. Severity paragraph surfaces schema numbers verbatim with confidence percentages. Drivers paragraph emits `[CITATION_ID]` markers per model. Action paragraph branches on action × urgency. Split paragraph slots in when ensemble splits. `renderer` field records the template version (`deterministic_template@1.0.0`) so PR-F.5 can distinguish LLM vs. fallback renders.
- **API endpoint** (`services/api/spray/views.py` + `urls.py`):
  - `GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/<verdict_id>/brief` — gated by `IsOrgViewer`; tenant-scoped via the BlockVerdict manager.
- **Frontend** (`apps/web/`):
  - `components/spray/VerdictCard.tsx` — grower-facing card. Severity dual-bar (powdery + downy) with confidence labels, action chip color-coded (spray red / scout amber / hold emerald), urgency label (`Today` / `Within 24h` / `Within 72h`), expandable "Why this verdict?" drivers list with `[citation_id]` markers, audit-hash footer. Renders schema-validated numbers verbatim via a `num()` parser that handles Postgres-decimal-string round-trips.
  - `app/spray/(app)/dashboard/page.tsx` — replaces M0-02a placeholder. Resolves active org via `/orgs/me`, expands every vineyard's blocks, fetches `verdicts/latest` per block, renders `VerdictCard` grid (or empty placeholder for blocks pre-first-verdict). Loads in parallel via `Promise.all`.
- **Tests**:
  - `apps/web/__tests__/verdict-card.test.tsx` — schema numbers verbatim, action chip + urgency rendering, drivers expander reveals citation markers, hold-action variant.
  - `services/api/spray/tests/test_daily_brief.py` — happy-path spray-24h brief asserts headline + verbatim numbers + citation marker, hold + scout + split-summary variants, drivers mirror passes through unchanged for the UI.

#### Scope cuts (deferred to PR-F.5)

- LLM-authored brief with P-Cite verifier + Jinja-fallback wiring.
- PDF audit-log export (covered by audit_hash on the card; full PDF render lands later).

### M1.5 PR-C: aggregation engine MVP (3 model runners + Year-0 ensemble + audit hash + verdict API) — READY FOR MERGE

PR on `graft-spray/m1.5/aggregation-engine-v0`. The keystone milestone where the SA-2 pivot becomes real code: 3 mechanistic model runners emit `RiskRecord`s, an equal-weight soft-vote ensemble fuses them into a `BlockVerdict` per block per day, both layers persist to Postgres + emit DataLakeEvents, audit-hash makes each verdict tamper-evident, hourly Celery beat fires in-season, and verdict API endpoints surface the result to the frontend.

#### Added

- **`services/api/spray/aggregation/`** package — clean, self-contained, importable independently of the worker.
  - `runners/base.py` — `ModelRunner` Protocol, `WeatherWindow` + `HourlyObservation` dataclasses, `RiskRecordResult` (mirrors event schema), deterministic `WeatherWindow.snapshot_id()` (sha256 over the observation series).
  - `runners/registry.py` — slug→class lookup, decorator-based self-registration, `all_runner_versions()` for audit hashing, eager imports for the three runners.
  - `runners/gubler_thomas.py` — UC Davis Powdery Mildew Risk Index 2013 revision (`docs/research/06_outbreak-prediction.md` 06-S2). 6h favourable blocks @ 21–30°C add +20; 2h lethal blocks @ >38°C subtract -10; RI capped 0–100; severity via `gt_ri_to_severity_1_10`.
  - `runners/caffi_primary.py` — Caffi 2009 primary infection downy mildew (06-S5). Three gating conditions over 24h: cumulative rain ≥ 2 mm, wetness ≥ 8h with T ≥ 11°C, mean temp ≥ 11°C. Surrogate score 0–10 mapped to severity.
  - `runners/caffi_secondary.py` — Caffi 2010 secondary infection (06-S6). Wet+warm hour count (T 10–25°C, LW ≥ 30 min) banded into severity 1–10.
  - `severity_anchors.py` — three anchor functions (powdery RI, primary surrogate, secondary hours) per spec §11A.4. Monotonic, bounded, deterministic. Backward-compat plan documented for Year-1+ updates.
  - `ensemble.py` — `equal_weight_soft_vote()` — averages severity per pathogen, computes confidence = 1.0 − σ(severities)/5.0 clipped, threshold-maps severity → action (`spray ≥ 7 ≥ scout ≥ 4 > hold`) and urgency. Emits a verdict dict matching `block_verdict.generated.v1.json` exactly. Year-1 weighted + Year-2 stacked variants flagged for later.
  - `audit.py` — `compute_audit_hash()` returns `sha256:HEX64` over `(input_snapshot_id, model_versions, ensemble_version)`. Deterministic + stable across dict ordering.
- **Django models** (`services/api/spray/models.py`):
  - `RiskRecord` — one row per block per pathogen per (model_id, valid_from). Tenant-scoped via `OrgScopedManager(via="block__vineyard__org_id")`. Unique on `(block, model_id, valid_from)` for idempotent upsert.
  - `BlockVerdict` — daily ensemble verdict consumed by the UI. Unique on `(block, date)`. Stores all fields from the schema verbatim including drivers, forecast_7d, audit_hash.
- **Migration `0008_aggregation_models`** — creates both tables, adds RLS policies that traverse `block → vineyard → org_id` (matches M1-09 Capture pattern). Reversible.
- **Celery worker task** (`services/worker/graft_worker/tasks/aggregation_run.py`):
  - `compute_all_active_blocks` (hourly beat, in-season April–October UTC) fans out per-block tasks.
  - `compute_block_verdict` runs all registered runners against the last 24h weather window for the block's region-default station, persists RiskRecords (upsert), emits `risk_record.emitted` per record, fuses via the ensemble, persists the verdict (upsert), emits `block_verdict.generated`.
  - Cadence env-overridable via `GRAFT_SPRAY_AGGREGATION_CADENCE_SEC` (default 3600).
  - Eagerly imported by `tasks/__init__.py` so `@shared_task` registers at worker boot.
- **API endpoints** (`services/api/spray/views.py` + `urls.py`):
  - `GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/latest` — most recent verdict; 404 if none yet.
  - `GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts?since=<iso>` — paginated history, default 30-day window.
  - Both gated by `IsOrgViewer`; tenant-scoped via the manager.
  - `BlockVerdictSerializer` + `RiskRecordSerializer` added.
- **Frontend stub** (`apps/web/app/spray/(app)/recommendations/page.tsx`) — placeholder page that links to verdict endpoints. Real UI lands in PR-F.
- **Tests** (~30 new):
  - `test_aggregation_runners.py` — registry sanity, severity anchors monotonic + bounded, GT high/low/lethal scenarios, Caffi primary 3-of-3 / 0-of-3 cases, Caffi secondary high/low cases, snapshot_id determinism.
  - `test_ensemble_and_audit.py` — audit_hash sha256 format, deterministic, changes when any input changes; ensemble action thresholding (spray/scout/hold), split_summary surfaces disagreement, empty-records still emits a valid 7-day-forecast verdict.
  - `test_verdict_endpoints.py` — latest returns most recent, 404 when none, since-param filtering, invalid-since 400, cross-org denial, viewer role can read.

#### Manual prerequisites

**None.** Reuses existing Render Postgres + worker + Redis. No new infra.

#### Notes

- **Year-0 simplifications** (intentional, documented in each runner's docstring): GT skips biofix detection + diurnal humidity gating; Caffi runners use qualitative gates instead of full energy-balance equations; forecast_7d is a deterministic flat-line stub until forecast windows arrive in PR-G. Caveats under "PR-C.5 / M2" in code comments.
- Adding a 4th runner is verified-by-design: drop a module under `aggregation/runners/`, decorate with `@register_runner`, add the import in `registry.py`. Tests assert this works for the three shipped runners; the PR-C plan §6 acceptance criterion mandates a stub `mills_table` runner test which we add in PR-C.5 alongside the real Mills implementation.
- `audit_hash` is reproducible: same `(input_snapshot_id, model_versions, ensemble_version)` always produces the same hash. Mutating any of the three changes the hash. Tested.
- The forecast in `forecast_7d` is a placeholder (every day is "hold severity 1.0"). Real 7-day forecasts require running each runner against forecast weather windows; that's wired in PR-G alongside the Sentinel-2 vigor anomaly feature.
- All emit_event calls use the schemas from PR-B; `scripts/check_event_schemas.py` will see new producers (`risk_record.emitted`, `block_verdict.generated`) and validate them.

### M1.5 PR-B: aggregation schemas (RiskRecord, BlockVerdict, AdvisoryEvent, SensorReading) — READY FOR MERGE

PR on `graft-spray/m1.5/aggregation-schemas`. Pure schema-registry additions with zero behavior change. Foundation for PR-C (aggregation engine), PR-D/E (sensor connectors), and PR-H (advisory feeds).

#### Added

- **`risk_record/emitted/v1.json`** — per-block, per-day, per-pathogen output of a single mechanistic model runner (Gubler-Thomas, Caffi Primary, Caffi Secondary, etc.). Spec §11A.1.
- **`block_verdict/generated/v1.json`** — daily ensemble verdict consumed by the grower-facing UI. Severity dual-track (powdery + downy), action enum (`spray|hold|scout`), urgency (`now|24h|72h|none`), drivers array with citation IDs, strict 7-day forecast (exactly 7 entries enforced), audit_hash sha256 format. Spec §11A.2.
- **`advisory_event/ingested/v1.json`** — public/government advisory feed envelope. Source slug, ISO 3166-2 region, hazard type, severity, license string, language enum, optional EN translation. Spec §12C.2.
- **`sensor_reading/ingested/v1.json`** — canonical sensor schema all vendor connectors (Davis, Pessl, METER, Sencrop) normalize to. Required `block_id`, `ts`, `source`, `device_id`, `quality_flag`; numeric fields nullable for graceful gap-fill. RH bounded 0–100. Quality flag enum: `ok|estimated|gap_filled|stale|bad`. Spec §12A.3.
- 16 new pytest cases in `test_schema_registry.py` covering well-formed payloads, bounded-value rejection, enum mismatch rejection, and structural constraints (e.g. `forecast_7d` must be exactly 7 entries, `audit_hash` must match `sha256:[hex64]`).

#### Changed

- `docs/spec/CODEBASE_PLAN.md` Section 14 — Q17, Q18, Q19 marked RESOLVED / DEFERRED:
  - Q17 — free-tier on CDSE + Letta; **AgentMail committed** as the email-as-IO surface (per-org feature flag at MVP+).
  - Q18 — accept default cloud-day fallback (hold last good vigor 10 days, then drop from ensemble). Behind a feature flag.
  - Q19 — deferred until first METER customer; default applies on arrival (gap-fill via RH heuristic).

#### Notes

- No Django models, no API endpoints, no producer call sites at this PR. All four schemas await consumers in PR-C (RiskRecord, BlockVerdict), PR-D/E (SensorReading), PR-H (AdvisoryEvent).
- `scripts/check_event_schemas.py` auto-discovers from `emit_event(...)` callsites and doesn't enumerate registered schemas; no update needed. New schemas are validated via the pytest suite which runs in CI.
- All four schemas set `additionalProperties: false` so producers can't accidentally extend the contract without amending the schema first.

### Pivot amendment: decision-intelligence aggregation hub (SA-2) — IN REVIEW

PR-A on `graft-spray/m1/pivot-amendment-docs`. Documentation-only amendment that locks in the strategic pivot from per-photo computer-vision detection to a per-vineyard decision-intelligence aggregation hub. CV becomes an optional Phase 3 scouting module (M3+); the M1-09 capture upload pipeline stays merged but the CV severity grading work slips behind M1.5 in priority.

#### Customer signal (canonical pivot rationale)

Five winery conversations independently surfaced the same insight: *"if you see mold it's already too late, but we still want something better than the smattering of sources we currently rely on."* Named: Far Niente (John McCarthy, Director Vineyard Ops), Newton Vineyards, Chandon, Sprucewood Shores, plus pattern across other Napa/Sonoma growers. McCarthy meeting was 2026-05-05 in person. This is the empirical basis for SA-2.

#### Added (docs only — zero code changes)

- `docs/spec/Graft-Spray-App-Spec.md` Appendix A — new SA-2 entry, plus six new sections inserted: §11A (Model Aggregation & Ensembling), §12A (Sensor Platform Integrations), §12B (Satellite & Remote Sensing), §12C (Advisory Feeds), §13A (Per-Tenant Agent Architecture), §13B (Recommendation Engine + Daily Card).
- `docs/spec/Graft-Spray-App-Spec.md` rewrites: §1 Executive Summary (terser, aggregation-hub framing), §5.5 (model-runner orchestration replaces hybrid CV inference), §8.9 (risk heatmap is ensemble-driven, not CV-driven). Demotions: §6.3, §8.5, §10 wrapped under "Phase 3" framings.
- `docs/spec/CODEBASE_PLAN.md` Section 2 — new directories under `services/api/spray/aggregation/`, `connectors/sensors/`, `connectors/satellite/`, `agents/`, `recommendation/`. Namespace convention locked: `providers/` for external read-only feeds, `connectors/sensors/` for vendor APIs the customer authenticates against.
- `docs/spec/CODEBASE_PLAN.md` Section 5 — M1.5 rows for all SA-2 work; `services/ml/*` moved from M1-10 to M3+ (Phase 3 CV scouting).
- `docs/spec/CODEBASE_PLAN.md` Section 13 — new risks R21–R26 (sensor API churn, satellite quota, model disagreement UX, agent lock-in, advisory scrape fragility, prescriptive-advice liability).
- `docs/spec/CODEBASE_PLAN.md` Section 14 — new questions Q15 (RESOLVED: daily verdict format), Q16 (RESOLVED: phased agent architecture), Q17 (OPEN: free-tier ceiling), Q18 (OPEN: Sentinel-2 cloud-day fallback), Q19 (OPEN: METER PHYTOS-31 requirement).
- Six new dossier files (`08_model-aggregation.md` through `13_advisory-feeds.md`) at ~500 lines each.
- `docs/research/pivot/` — `PIVOT_AMENDMENT_PLAN.md`, `SPEC_AMENDMENT_v2.md`, `CLAUDE_CODE_DIRECTIVE_v3.md` (8-PR implementation track).
- Updated `docs/research/00_index.md`, `glossary.md`, `paywalled_queue.md`, `sources_master.csv` (211 new pivot-related sources).

#### Manual prerequisites

**None.** PR-A is documentation-only. Subsequent PRs (PR-B onward) need a willing pilot grower with Pessl/Davis/METER stations to validate sensor connectors.

#### Notes

- Original CV-centric Executive Summary preserved in git history at commit `73a5371`.
- 8-PR implementation sequence (PR-B schemas → PR-C aggregation engine → PR-D Pessl → PR-E Davis+METER → PR-F daily verdict UI + LLM brief → PR-G Sentinel-2 → PR-H advisory feeds EU/AR) per directive.
- Strategist's flag: aggressive scope vs Moelis runway (June 1). PRs G + H deferable to post-Moelis without breaking the Napa-launch demo.

### M1-09: Photo/video capture upload (web) — READY FOR MERGE

PR #16 on `graft-spray/m1/capture-upload-web`. The first user-visible feature in the M1 layer (Spec §8.5). Step 2 of the M0-06 → M1-09 → M1-10 → M1-12 triad that gives a Napa beta grower the visible loop before Moelis blackout.

#### Added

- `Capture` model on `services/api/spray/models.py`. Tenant-scoped via `OrgScopedManager(via="block__vineyard__org_id")`. Lifecycle: `pending` → `uploaded` → optional `archived_at`. M1-09 ships only the photo path; video defers to M1-10.
- Migration `0006_capture` creates the table and adds the RLS policy that traverses `block → vineyard → org_id` for tenant isolation.
- `services/api/spray/imagery.py` — boto3 helpers for presigned POST policies, presigned GET URLs, and S3 HEAD verification. `ALLOWED_MIME` enforces `image/jpeg|heic|heif|video/mp4`. `MAX_SIZE_BYTES = 25 MB` per spec §8.5.
- Four new endpoints in `services/api/spray/views.py`:
  - `POST /api/spray/orgs/<org>/blocks/<block>/captures/init` — IsOrgMember; mints presigned POST policy + creates `pending` Capture row
  - `POST /api/spray/orgs/<org>/captures/<id>/finalize` — IsOrgMember; verifies S3 HEAD, flips to `uploaded`, emits `capture.uploaded` lake event
  - `GET /api/spray/orgs/<org>/captures` — IsOrgViewer; filters by `block_id` and `status`
  - `GET / DELETE /api/spray/orgs/<org>/captures/<id>` — detail + soft-archive
- New schema registry entry `services/api/spray/schemas/events/capture/uploaded/v1.json`. CI validates at PR time.
- `apps/web/components/spray/CaptureUploader.tsx` — drag-drop + file-pick uploader. Per-file flow: init → S3 PUT (XHR with progress) → finalize. Up to 10 files at once.
- `apps/web/app/spray/(app)/captures/page.tsx` — grid of thumbnails, filterable by block, click-to-modal.
- `apps/web/components/spray/SprayShell.tsx` sidebar gains a **Captures** entry between Vineyards and Forecasts.
- New `IMAGERY_BUCKET` Django setting (defaults to `graft-spray-imagery-dev`).
- `docs/runbooks/m1-09-imagery-bucket.md` covers AWS bucket creation, CORS policy, IAM extension, env vars, smoke test, rollback.
- Tests:
  - `test_capture_models.py` — defaults, S3 key uniqueness, OrgScopedManager via block→vineyard→org traversal, archive.
  - `test_capture_endpoints.py` — moto-mocked S3 round-trip; init creates pending; rejects unsupported MIME and oversize; viewer denied on init; finalize 409 when S3 missing; finalize idempotent on re-call; list filters by block; archive on detail DELETE; emits exactly one `capture.uploaded` event per finalize.
  - `apps/web/__tests__/capture-uploader.test.tsx` — file-pick triggers init → S3 PUT (mocked XHR) → finalize.

#### Changed

- `apps/web/app/spray/(app)/vineyards/[vineyard_id]/page.tsx` — `BlockEditor` side panel embeds the new `<CaptureUploader />` below the existing fields. The orgId is passed through from the parent state.

#### Manual prerequisites (Benson, before milestone-closeout merge)

- Create AWS S3 bucket `graft-spray-imagery-dev` in `us-west-2` with CORS + Block Public Access + SSE-S3
- Extend `graft-spray-lake-rw` IAM policy to include the new bucket
- Add `IMAGERY_BUCKET=graft-spray-imagery-dev` env var to BOTH `graftwebsite` and `graft-spray-worker` Render services
- Confirm `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` already set (from M0-04)

All steps documented in `docs/runbooks/m1-09-imagery-bucket.md`.

#### Notes

- M1-09 ships the upload pipeline ONLY. No ML inference (M1-10), no severity grading, no correction loop. Captures sit in S3 and Postgres until M1-10 wires the cloud classifier.
- Browser uploads bypass Django entirely — direct PUT to S3 via presigned POST policy. Saves Render bandwidth + cuts upload latency. Server validates the `Content-Type` and size at the policy level so the browser can't lie about what it's uploading.
- Default consent at M1-09: respect whatever the user toggled in onboarding (`photo_for_training` flag from M0-02). M1-10 will tag the lake event payload with the consent flag at training time.
- Single-part upload only at M1-09 (max 25 MB). iOS multipart for files >5 MB lands in M2.
- HEIC photos upload fine but display falls back to "tap to download" outside Safari. M1-10 generates a JPEG thumbnail for cross-browser preview.

### M0-06: Weather adapter (Napa/Sonoma) + SA-1 Risk Indices — READY FOR MERGE

PR #14 on `graft-spray/m0/weather-and-risk-feeds`. Combines original M0-06 (weather adapter) and M0-06b (SA-1 external risk index aggregator) per Strategist's call (same worker tier, same provider abstraction). Spec §11-12 + Appendix A SA-1.

#### Added

- `services/api/spray/providers/` package with two Protocols (`WeatherProvider`, `ExternalRiskIndexProvider`) plus four concrete adapters:
  - **Visual Crossing** (primary weather, free tier permits commercial with attribution, only consumer API with leaf wetness pre-computed)
  - **Generic CSV** (escape hatch for any unsupported station)
  - **UC IPM Grape PM RAI scraper** (SA-1, defensive HTML regex)
  - **uspest.org Grape PM scraper** (SA-1, defensive HTML regex)
- `WeatherStation`, `WeatherObservation`, `ExternalRiskIndex` models on `services/api/spray/models.py`. Unique constraints `(provider, station_id)`, `(station, ts)`, `(region, source, pulled_at_hour)` enforce idempotency.
- Migration `0005_weather_models` creates the three tables and seeds one regional-default `WeatherStation` row per supported AVA cluster (Napa, Sonoma, Burgundy, Bordeaux, Mendoza, other) using Visual Crossing as the provider.
- Celery beat schedule additions (`services/worker/graft_worker/celery.py`):
  - `weather-pull` every 3,600s — fans out one `pull_station.delay(...)` per active WeatherStation
  - `external-risk-index-pull` every 3,600s — fans out one `pull_external_index.delay(region, source)` per (region, source) pair
- Async backfill task (`backfill_vineyard_weather`) fires on Vineyard create, pulls 14 days of hourly observations from the region-default station so M1-07 (Gubler-Thomas) has an initial baseline. Best-effort: failure does NOT block vineyard creation.
- Three new schema-registry entries: `weather/observation_pulled/v1.json`, `weather/forecast_pulled/v1.json`, `external_risk_index/pulled/v1.json`. CI's `check_event_schemas.py` validates them at PR time.
- `GET /api/spray/admin/provider-health` admin endpoint returning liveness + latency for every registered provider. Authenticated-only; M0-08 will wrap it in Sentry alerting.
- Provider-shared exception hierarchy: `ProviderError` → `ProviderRateLimitError` (worker retries with exponential backoff), `ProviderAuthError` (no retry, ops fixes the env var), `ProviderResponseError` (worker retries once). Network errors degrade to ProviderResponseError.
- `VISUAL_CROSSING_API_KEY` env var surfaced in `graft_api/settings.py`.
- `docs/runbooks/m0-06-weather.md` covering Visual Crossing signup, env-var setup on both Render services, smoke-test commands, free-tier quota math, monitoring stub, rollback path.
- New tests:
  - `test_weather_models.py` — unique-constraint enforcement on all three new models.
  - `test_provider_registry.py` — known slugs, unknown raises, region defaults.
  - `test_visual_crossing.py` — happy path, 429 → rate-limit, 5xx → response error, missing key → auth error, partial data response, km/h to m/s wind conversion.
  - `test_external_risk_providers.py` — UC IPM happy path + parse-failure fallthrough + risk-level mapping; uspest happy path + 5xx; both `health()` paths.

#### Changed

- `services/api/spray/views.py` Vineyard create now enqueues `backfill_vineyard_weather.delay(...)` after the lake event emit; failure is logged but does not affect the response.
- `services/worker/graft_worker/tasks/__init__.py` eagerly imports the two new task modules so `@shared_task` registers at worker startup (M0-04 autoload pattern).

#### Manual prerequisites (Benson, before milestone-closeout merge)

- Visual Crossing API key signup (free, ~10 min). Add `VISUAL_CROSSING_API_KEY` to BOTH the API and worker Render services.
- No new AWS / Render Redis / Render worker provisioning. Reuses M0-04 worker tier.

#### Notes

- Tomorrow.io is **dropped** from the spec's provider catalog: leaf wetness sits behind sales-gated agriculture-premium pricing with no published rate card. Open-Meteo will replace it as the M0-06a paid alternate.
- CIMIS adapter (Scout flagged as Napa-optimal) is **deferred to M0-06a**. Visual Crossing's gridded data is sufficient for the M0 launch.
- The HTML scrapers are defensive: when the page reflows, they fail gracefully (write a row with `risk_level=low` and `raw_payload.parse_error=...`). M0-06a adds snapshot regression tests.
- `WeatherStation` does NOT use `OrgScopedManager` because regional-default rows have `org=None` and must be readable by every authenticated user; the view layer applies `Q(org=request_org) | Q(is_regional_default=True)` instead. RLS would require a policy exception for null-org rows.
- `WeatherObservation` does NOT carry an `org_id` column (highest-volume table); tenancy is resolved by joining through `station.org`.

### M0-05: Satellite Map + Polygon Draw — READY FOR MERGE

PR #13 on `graft-spray/m0/maps-polygon-draw`. First milestone where the app actually shows something on a map (Spec §8.12).

#### Added

- `apps/web/components/spray/SprayMap.tsx` — MapLibre GL satellite map component. Esri World Imagery raster basemap (free with attribution). Block geoms render as a single GeoJSON source with fill (35% amber) and stroke (1.5px white) layers. Click-to-select wires through to the parent. Optional draw mode mounts `@mapbox/mapbox-gl-draw` for polygon-create / polygon-update interactions.
- `apps/web/components/spray/CreateVineyardDialog.tsx` — minimal name + region modal.
- `apps/web/app/spray/(app)/vineyards/page.tsx` — Vineyards list. Active Org = first Membership (matching the M0-02a OrgSwitcher heuristic). "Create vineyard" button opens the dialog and routes to the new detail page.
- `apps/web/app/spray/(app)/vineyards/[vineyard_id]/page.tsx` — Vineyard detail with embedded map (~70%) plus a side panel (~30%) showing block list / block editor. Polygons round-trip through the M0-03 Block API: drawing POSTs, edits PATCH, archive DELETEs. "Export GeoJSON" downloads the active block's geom as a `.geojson` file.
- `services/api/spray/signals.py` — Django `post_save` / `post_delete` signal that recomputes `Vineyard.centroid` as the centroid of the union of live (non-archived) child Block geoms. Wraps in `transaction.on_commit` so the new state is visible to the recompute. PostGIS-only (no-op on non-Postgres backends).
- New tests:
  - `apps/web/__tests__/spray-map.test.tsx` — verifies SprayMap mounts; mocks maplibre-gl wholesale (jsdom can't render WebGL).
  - `apps/web/__tests__/create-vineyard-dialog.test.tsx` — submit, disabled-empty-name, backdrop-close.
  - `services/api/spray/tests/test_centroid_recompute.py` — empty vineyard centroid is None; centroid set after first block; recomputes after archive; back to None when all blocks archived.
- `maplibre-gl@5.x` and `@mapbox/mapbox-gl-draw@1.x` added to `apps/web` deps.

#### Changed

- `services/api/spray/apps.py` — `SprayConfig.ready()` imports `spray.signals` so the centroid signal attaches at app startup.
- `apps/web/components/spray/SprayShell.tsx` — sidebar Vineyards link already pointed at `/spray/vineyards` (placeholder from M0-02a) and now resolves to a real page.

#### Manual prerequisites

**None.** No new env vars, Render, Vercel, or AWS changes. Esri World Imagery requires no API key; attribution is rendered automatically by MapLibre's attribution control.

#### Notes

- Vineyard detail page is 292 kB First Load JS (mostly MapLibre + draw); only loaded on that route. Marketing pages and other Spray pages stay at ~140 kB.
- Block list endpoint already filters out archived rows in M0-03; the SprayMap reuses the same field on the client for symmetry.
- Polygon validation is currently client-best-effort + server `GEOSGeometry` parser. Stricter `ST_IsValid` enforcement lands in M0-05a alongside parcel-snap and water-mask warnings.
- `Vineyard.centroid` recompute uses PostGIS `ST_Union` aggregate → centroid; runs at most once per write via `transaction.on_commit`.

### M0-04: Data Lake Ingest — READY FOR MERGE

PR #11 on `graft-spray/m0/data-lake-ingest`. Stands up the worker tier and forwards `DataLakeEvent` rows to S3 as Parquet on a 15-minute Celery beat schedule (Spec §19).

#### Added

- New `services/worker/` package: Celery 5.x app, Redis broker config, beat schedule, `manage.py forward_now` ops triage entrypoint, Render `Procfile`. The worker shares the Django ORM with `services/api` by importing `spray.models` directly; no separate database client.
- `services/api/spray/schemas/registry.py` — JSON Schema registry with `validate(category, payload, version)`. Caches schemas per process, raises `SchemaValidationError` on miss or invalid payload.
- Six initial event schemas (M0-03 emit sites): `vineyard.created`, `vineyard.updated`, `vineyard.archived`, `block.created`, `block.updated`, `block.archived`. Every schema sets `additionalProperties: false` so unknown keys fail validation.
- `services/api/spray/lake.py` — `emit_event(category, payload, org, user, schema_version)` helper. Validates against the registry, then creates the `DataLakeEvent` row. M0-03's `_emit_lake_event` is now a thin wrapper around this so every emit site goes through validation.
- `services/worker/graft_worker/lake_writer.py` — pulls unforwarded `DataLakeEvent` rows, groups by `(org_id, category, date)`, writes one Parquet file per group to `s3://<LAKE_BUCKET>/<org_id>/<category>/<yyyy-mm-dd>/<batch_uuid>.parquet` with SSE-KMS, then atomically marks the rows as forwarded. Idempotent on retry: rows are claimed by `id IN [...] AND forwarded_at IS NULL`.
- `services/worker/graft_worker/tasks/data_lake_etl.py` — Celery task wrapper with exponential-backoff retry (3 attempts).
- Migration `0004_datalakeevent_forwarded_at` — adds the column plus a partial index on `(category, created_at) WHERE forwarded_at IS NULL` so the worker's hot-path query stays fast as the lake grows.
- `scripts/check_event_schemas.py` — CI guard that greps the codebase for `emit_event(category=...)` call sites and confirms each has a registered schema. Hard CI step (no `continue-on-error`).
- `docs/runbooks/m0-04-data-lake.md` — AWS bucket + IAM creation, Render Redis + worker provisioning, smoke-test commands, prod bucket migration steps, monitoring + rollback.
- `services/worker/README.md` — local-dev recipe, Render deploy steps, "adding a new event" checklist for future contributors.
- `infra/dev/docker-compose.yml` gains a `redis` service so local dev runs the full stack with one `docker compose up -d`.
- New tests:
  - `test_schema_registry.py` — registry loads, validates, rejects missing fields, rejects unknown categories, rejects unknown versions, enforces `additionalProperties: false`.
  - `test_emit_event.py` — well-formed payload creates row; invalid payload raises and creates no row; unknown category raises.
  - `test_lake_writer.py` — uses `moto` to mock S3. Forwards pending events, skips zero-pending, idempotent re-runs do not duplicate, two orgs land under separate prefixes, Parquet payload round-trips through `pyarrow.parquet.read_table`.

#### Changed

- `services/api/requirements.txt` adds the worker's runtime deps (`celery[redis]`, `redis`, `boto3`, `pyarrow`, `jsonschema`) and test deps (`moto[s3]`) so pytest from `services/api` can import `graft_worker.lake_writer`.
- `services/api/pytest.ini` adds `pythonpath = . ../worker` so test files in `services/api/spray/tests/` can import the worker module.
- `.github/workflows/ci.yml` gains a "Schema registry check" step that runs `scripts/check_event_schemas.py` against every PR.
- `services/api/spray/views.py`'s `_emit_lake_event` is now a thin wrapper around `spray.lake.emit_event` so every M0-03 emit site goes through schema validation. No behavioural change for valid payloads.

#### Manual prerequisites (Benson, before milestone-closeout merge)

- AWS account + S3 bucket `graft-spray-lake-dev` in `us-west-2` (free tier covers M0).
- IAM user `graft-spray-worker` with bucket-scoped S3 access; Access Key + Secret captured.
- Render Redis instance (~$10/mo).
- Render Background Worker service for `services/worker/` (~$7/mo) with eight env vars set.

Total new monthly infra cost: ~$17-25/mo. All steps documented in `docs/runbooks/m0-04-data-lake.md`.

#### Defaults locked from plan §7

1. Raw Parquet at M0-04, Iceberg metadata in M0-04a if needed.
2. AWS region `us-west-2`.
3. 15-min batching cadence via Celery beat.
4. Bucket name `graft-spray-lake-<env>`.
5. AWS free tier through M1; flag billing at 50% utilization.

#### Notes

- M0-03 emit payloads were checked against the new schemas before refactor; all six categories validate without payload edits.
- DataLakeEvent rows continue to land via the M0-03 RLS-protected `objects.unscoped().create(...)` path; the worker is the sole writer once they exist.
- Long-lived AWS credentials are a known wart (R34); IAM-role assumption via Render OIDC swaps in at M0-08.
- No Iceberg metadata layer at M0-04. Downstream readers parse partitioned Parquet directly via `pyarrow.dataset` or DuckDB. Iceberg lands in M0-04a once we have multiple readers.

### M0-03: Postgres + PostGIS schema — READY FOR MERGE

PR #10 on `graft-spray/m0/postgis-schema`. The database layer that lights up Vineyards, Blocks, and tenant isolation per spec §9, §17.2.

#### Added

- `Vineyard` model with optional EPSG:4326 `centroid` (Point) and GIST index. Tenant-scoped via `OrgScopedManager()`.
- `Block` model with required EPSG:4326 `geom` (Polygon) and GIST index. Tenant-scoped via `OrgScopedManager(via="vineyard__org_id")` so the FK chain is the source of org context.
- `DataLakeEvent` skeleton model — every Vineyard / Block write emits a row (categories `vineyard.created`, `vineyard.updated`, `vineyard.archived`, `block.created`, `block.updated`, `block.archived`). M0-04 picks these up and forwards to S3 + Iceberg; M0-03 just accumulates them so the schema-registry pattern is in place.
- `spray.managers.OrgScopedManager` + `OrgScopedQuerySet` — every tenant-scoped read MUST call `.for_org(org)` before evaluation. Iterating an unscoped queryset raises `OrgScopeRequiredError` (loud failure, not silent leak). Explicit `.unscoped()` escape hatch for admin / migration / audit paths.
- `spray.middleware.CurrentOrgMiddleware` — sets `app.current_org_id` Postgres session GUC per request via `set_config()`. Cleared in the `finally:` so connection-pool reuse cannot leak across requests. No-op on non-Postgres backends so dev sandboxes keep working.
- Migration `0002_postgis_vineyard_block_datalake` — installs `postgis` + `postgis_topology` extensions (idempotent), creates the three new tables, adds GIST indexes via raw SQL.
- Migration `0003_rls_policies` — enables `ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on Membership, Vineyard, Block, DataLakeEvent. Each policy filters by `app.current_org_id` GUC. Block's policy traverses through `spray_vineyard.org_id`. Fully reversible.
- DRF endpoints (mounted at `/api/spray/`):
  - `GET / POST /orgs/<org_id>/vineyards`
  - `GET / PATCH / DELETE /orgs/<org_id>/vineyards/<vineyard_id>` (DELETE archives + cascades to child Blocks)
  - `GET / POST /orgs/<org_id>/vineyards/<vineyard_id>/blocks`
  - `GET / PATCH / DELETE /orgs/<org_id>/blocks/<block_id>`
- `GeometryField` DRF serializer — accepts GeoJSON dict or WKT string on write, returns GeoJSON dict on read. EPSG:4326 enforced at SRID-set time.
- `infra/dev/docker-compose.yml` — local-dev `postgis/postgis:16-3.4` service mapping `:5432`. Mirrors Render Postgres Pro 16 + PostGIS 3.4.
- CI service container: `postgis/postgis:16-3.4` with `DATABASE_URL` set on the workflow. GDAL apt-installed for `django.contrib.gis`. New `pytest spray/tests/` step runs the full Django test suite against real Postgres + PostGIS.
- `docs/runbooks/m0-03-render-postgis.md` — Render Pro upgrade steps, PostGIS extension verification, RLS smoke check, local-dev one-time setup, rollback path.
- New tests:
  - `test_org_scoped_manager.py` — unscoped iteration raises, `.for_org(...)` filters, `.unscoped()` escape hatch works, Block traverses through `vineyard__org_id`, DataLakeEvent enforces scope.
  - `test_vineyard_block_endpoints.py` — happy path + RBAC denial across every route, GeoJSON round-trip, archived-row filtering, cascade-archive on Vineyard delete, DataLakeEvent emission per write.

#### Changed

- `DATABASES['default']` switched from SQLite default to Postgres + PostGIS (`postgis://graft:graft@localhost:5432/graft_spray`). SQLite is no longer supported because the spray app uses spatial fields.
- `INSTALLED_APPS` adds `django.contrib.gis` (PostGIS-backed model fields).
- `MIDDLEWARE` adds `spray.middleware.CurrentOrgMiddleware` after auth middleware.
- Admin (`spray/admin.py`) registers Vineyard + Block with `gis_admin.GISModelAdmin` so the geom widgets render with a Leaflet OSM picker. DataLakeEvent is read-only in admin.
- `services/api/db.sqlite3` removed from the repo (was only ever a local-dev artifact and is incompatible with the new spatial fields).

#### Manual step (Benson, before merge)

- **Render Postgres Pro upgrade** (~$20/month) — required for PostGIS extension. Per-spec §16.1, Q3 RESOLVED. Documented in `docs/runbooks/m0-03-render-postgis.md`.

#### Notes

- Existing M0-02 models (Org, User, Membership, Session, AuthEvent, ConsentRecord) keep their default manager. The tighter `OrgScopedManager` is opt-in for the new spatial models so the M0-02 test suite continues to pass without edits. Tightening Membership comes in a follow-up.
- RLS policies use `current_setting('app.current_org_id', true)` with the `, true` flag (returns empty string when unset) so default-deny is the natural behavior for any request that lacks org context.
- Block delete on the Vineyard archive endpoint is a cascade by default per plan §9 question 3.
- Blocks honor archived state in list endpoints (`archived_at IS NULL` filter) so the UI can render only live blocks without extra parameters.

### M0-02a: Website Integration (`/spray` nav + app shell) — READY FOR MERGE

PR #9 on `graft-spray/m0/website-integration`. Adds the first-class `/spray` surface to the marketing site per spec §21.

#### Added

- `/spray` marketing landing (public, indexed) with hero, three-bullet value prop, and an auth-aware CTA (`<SprayLandingCTA />`) that flips between sign-up + log-in for visitors and "Open dashboard" for signed-in users.
- `/spray/dashboard` placeholder dashboard, rendered inside the new authenticated app shell.
- `/spray/post-login` server-side router that branches the user based on Org membership: no Org → `/spray/onboarding`, any Org → `/spray/dashboard`. Falls through to onboarding when the API is unreachable so the flow does not dead-end while Render is on the pre-M0-closeout codebase.
- `/spray/onboarding` (existing M0-02 stub, moved from `/onboarding` to its proper URL).
- App shell components in `apps/web/components/spray/`:
  - `SprayShell` — sidebar + topbar + main content area; sidebar nav links to Dashboard, Vineyards, Forecasts, Spray records, Settings (placeholders for routes that land later).
  - `OrgSwitcher` — top-bar dropdown that pulls memberships from `GET /api/spray/orgs/me`; falls back to "Personal" placeholder when the API is unreachable.
  - `SprayLandingCTA` — auth-aware marketing CTA.
- `MarketingChromeGuard` — hides the marketing nav and footer on authenticated `/spray/<deeper>` routes; keeps them on the bare `/spray` landing and all marketing routes.
- "Spray" link added to the marketing nav between "Tool" and "Contact"; the link target deep-links signed-in users straight to `/spray/dashboard`.
- `apps/web/app/sitemap.ts` (Next.js `MetadataRoute.Sitemap`) covering the five marketing routes including `/spray`. Authenticated routes carry `metadata.robots.index = false`.
- Vitest harness: `vitest.config.ts`, `vitest.setup.ts`, three test files (`marketing-chrome-guard.test.tsx`, `nav.test.tsx`, `spray-landing-cta.test.tsx`) — 11 tests, all green.
- `pnpm test` and `pnpm test:watch` scripts in `apps/web/package.json`.

#### Changed

- `<ClerkProvider>` in the root layout now sets `afterSignOutUrl="/spray"` so logout returns the user to the Spray landing page (spec §21.4).
- `apps/web/middleware.ts` protects only the deeper `/spray/<authenticated>` routes; the bare `/spray` landing stays public.
- `/sign-in` and `/sign-up` Clerk pages now redirect to `/spray/post-login` after auth (replaced the M0-02 placeholder of `/onboarding`).
- Old `apps/web/app/(spray)/` parens-group route directory removed; replaced by the real folder `apps/web/app/spray/` containing both the public landing (`page.tsx`) and the `(app)/` route group housing the authenticated shell.

#### Notes

- Lighthouse parity check is a manual step at PR-review time; bundle-size budget enforcement lands in M0-04 alongside `packages/ui`.
- Org switcher placement is top bar center-right (the default from plan §9 question 2).
- Logged-in users visiting `/spray` see the marketing page with a swapped "Open dashboard" CTA, not an auto-redirect (the default from plan §9 question 3) — keeps the URL meaningful and SEO-clean.

### M0-02: Account & Identity (Clerk) — READY FOR MERGE

PR #6 on `graft-spray/m0/auth-identity`. Stands up the foundation of Graft Spray's identity layer: Clerk hosts auth flows for `apps/web`, a new `spray` Django app under `services/api/` owns the multi-tenant data model, Clerk webhooks sync canonical User records, DRF authentication and permission classes enforce the four-role RBAC, and an in-app account-deletion endpoint satisfies Apple App Review Guideline 5.1.1(v).

#### Added

- `services/api/spray/` Django app with six models per spec section 9.1 / section 20: `Org`, `User`, `Membership` (4-role RBAC), `Session`, `AuthEvent` (immutable audit trail, 19 event types), `ConsentRecord` (4 categories per spec section 19.5).
- `services/api/spray/auth/clerk.py` — `ClerkJWTAuthentication` DRF class. Validates `Authorization: Bearer` tokens against Clerk's JWKS via PyJWT + `RSAAlgorithm.from_jwk`. JWKS cached for one hour with single force-refresh on `kid` mismatch. Resolves the local `User` row by `clerk_user_id`.
- `services/api/spray/permissions.py` — five DRF permission classes (`IsAuthenticatedSpray`, `IsOrgViewer`, `IsOrgMember`, `IsOrgAdmin`, `IsOrgOwner`). Org context resolves from `view.kwargs['org_id']`, request body, or `X-Org-Id` header.
- Clerk webhook ingestion at `POST /api/spray/clerk/webhook`. Svix signature validation; dispatches `user.created`, `user.updated`, `user.deleted`, `session.created`, `session.removed`. Idempotent on replay.
- Org and Membership endpoints (spec section 20.4): create / list-mine / get / patch / archive Orgs; list / invite / role-change / remove Memberships. Last-Owner protection on demote and remove paths. Each write emits an `AuthEvent`.
- Account lifecycle endpoints: `POST /api/spray/account/delete` (two-step deletion with `confirm: true`), `POST /api/spray/account/export` (synchronous JSON dump at M0-02; full async + photo-zip lands in M0-04).
- Per-category consent toggles at `POST /api/spray/account/consent` (upsert array of `{category, granted}`); GET endpoint returns the caller's records.
- 66 pytest tests covering models, JWT validation, RBAC matrix, webhook signature + idempotency, every Org endpoint (happy path + denial), account delete (including last-Owner block), and consent toggles. `pytest.ini` wires `DJANGO_SETTINGS_MODULE`.
- `apps/web/middleware.ts` (Clerk middleware protects `/spray/*` and `/onboarding/*`).
- Clerk-hosted `/sign-in` and `/sign-up` pages with the brand amber primary color.
- `<ClerkProvider>` wraps the root layout; `Nav` swaps to `<UserButton>` when signed in (uses `useAuth()` since `SignedIn`/`SignedOut` were dropped in `@clerk/nextjs` v7).
- `apps/web/app/(spray)/onboarding/page.tsx` — minimal stub that renders the four consent toggles and calls the consent endpoint via the user's Clerk JWT. Surfaces non-2xx responses inline (caught the optimistic-UI bug during M0-02 manual E2E).
- `apps/web/.env.example` documenting required Clerk env vars.

#### Changed

- `services/api/graft_api/settings.py` — registers `rest_framework` and `spray` apps, sets `ClerkJWTAuthentication` as the default DRF auth class, surfaces five Clerk env vars (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_FRONTEND_API`, `CLERK_JWKS_URL`).
- `services/api/requirements.txt` — adds `djangorestframework`, `PyJWT`, `cryptography`, `svix`, `pytest`, `pytest-django`.

#### Manual step (Benson, at merge time)

- **Render env vars** (already done 2026-04-30): `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_FRONTEND_API`.
- **Vercel env vars** (already done 2026-04-30): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` across Production / Preview / Development.
- **Vercel `BACKEND_URL`** (deferred to M0 closeout): set to the Render service URL once `graft-spray/main` merges into `main` and the spray endpoints go live on Render.

#### Notes

- Manual E2E verified on Vercel preview `graft-website-git-graft-spray-m0a-...vercel.app`: signup → email verify → onboarding land → sign out → middleware redirect on protected route. Consent roundtrip deferred until M0 closeout deploys the spray app to Render; the 8 consent unit tests cover the backend logic.
- Two resolved Open Questions affect M0-02: Q5 (subpath routing `graftsystems.com/spray/*`), Q8 (Clerk over Auth0). Q14 free-tier resolution holds (Clerk free tier covers 10,000 MAU, sufficient through M2).
- `AuthEvent` rows are insert-only by application convention at M0-02; database-trigger immutability lands in M0-03 alongside row-level security.
- Sign in with Apple deferred to M2 per the dossier decision.

### M0-01: Monorepo bootstrap — IN PROGRESS

PR #5 on `graft-spray/m0/repo-bootstrap`. Migrates the repo to a pnpm + Turborepo monorepo without disturbing existing production deploys.

#### Added

- Workspace scaffolding at the repo root: `package.json` (root manifest), `pnpm-workspace.yaml`, `turbo.json`.
- `.gitattributes` enforcing LF line endings (resolved Open Question Q9) plus Git LFS tracking patterns for `docs/research/assets/*/datasets/**` (Q11; activates when the dataset-import PR introduces actual files).
- `apps/`, `services/`, `packages/`, `infra/`, `.github/workflows/` directory skeleton.
- `docs/runbooks/m0-01-rollback.md` documenting V1 (Vercel) and G1/G2 (git revert) rollback paths plus the `pre-monorepo` tag fallback.
- `packages/ui` skeleton (M0-02 will populate it with shadcn/ui primitives extracted from `apps/web/components/ui/*` and brand design tokens extracted from `apps/web/tailwind.config.ts`).
- `packages/eslint-config` with three subpath exports (`./nextjs`, `./react-native`, `./node`); empty rule sets at M0-01, real rules in M0-02.
- `packages/tsconfig` with `base.json`, `nextjs.json`, `react-native.json`, `node.json`. Strict mode plus `noUncheckedIndexedAccess` baseline.
- `packages/client-core` skeleton; the OpenAPI-generated TypeScript client lands in M0-04 once `services/api/openapi.yaml` stabilizes.
- `.gitmodules` declaring `services/api/PredictionTool` correctly (resolves R1; the file was missing before, breaking fresh `git clone --recursive`).
- `.github/workflows/ci.yml` for lint, type-check, build, test on every PR plus push to `main` and `graft-spray/main`. Lint, type-check, and test currently `continue-on-error` until M0-02 populates real rule sets and test suites; build and `python manage.py check` are hard requirements.
- `CONTRIBUTING.md` documenting the two-track workflow (marketing-site fixes vs. Graft Spray work) plus Conventional Commits, squash-merge, and the no-em-dashes rule.
- This `CHANGELOG.md`.

#### Changed

- `frontend/` moved to `apps/web/` via per-file `git mv` (preserves history; verifiable via `git log --follow`). `apps/web/package.json` `name` field updated to `@graft/web` for the pnpm workspace.
- `backend/` moved to `services/api/` via per-file `git mv` (the directory-level `git mv` failed twice with a Windows file-lock issue at the directory level even after relocating `.venv` and `db.sqlite3`; per-file worked). The `backend/PredictionTool` submodule moves to `services/api/PredictionTool` with its dirty working-tree state intact (resolved Open Question Q2: leave alone).
- `render.yaml` `rootDir` changed from `backend` to `services/api` (activates at merge time when Render picks up the new yaml).
- Root `README.md` rewritten to reflect the monorepo structure while preserving the collaborator table, deploy instructions (with updated paths), and API documentation.
- `.gitignore` extended with monorepo patterns (`.turbo/`, `apps/*/dist/`, `services/*/.venv/`, etc.).

#### Manual step (Benson, at merge time)

- **Vercel root directory**: change from `frontend` to `apps/web` in the Vercel dashboard. Vercel does not redeploy on settings change, so production keeps serving the previous build until the next git push triggers a new deploy. Do this in tandem with the M0-01 squash-merge into `graft-spray/main`. See [`docs/runbooks/m0-01-rollback.md`](./docs/runbooks/m0-01-rollback.md) section V1 if anything goes sideways.

#### Notes

- Three resolved Open Questions affect M0-01 directly: Q1 (`frontend-cinematic/` stays at repo root, untouched), Q2 (submodule untouched), Q9 (`.gitattributes` LF policy), Q11 (Git LFS), Q12 (orphan branches abandoned). Full resolution log in CODEBASE_PLAN.md section 14.
- Empty `backend/` directory shell remains at repo root after the rename due to a residual Windows lock; harmless, removable manually with `rmdir backend` once the lock releases.

### M0-00b: Application Specification (#4)

Full spec PDF (73 pages, 791 KB) plus markdown source plus 7 rendered diagrams plus `CLAUDE_CODE_PLAN.md` operating manual.

### M0-00: Whole-Codebase Plan (#3)

`CODEBASE_PLAN.md` with all 14 sections per the spec brief: repository inventory, target tree, milestone allocation, branch and PR plan, migration plan, environment and secrets, risk register (R1-R20), open questions (Q1-Q14, all resolved or partially resolved as of 2026-04-30), Appendix A spec amendments (SA-1 live external risk-index aggregator).

### M0-00a: Research Dossier (#2)

The Graft Spray "living brain" research dossier under `docs/research/`. 7 brain category files, master index, glossary, full source registry (`sources_master.csv`, 405 sources), `business/competitive-landscape.md` (NOT in chatbot RAG). Asset folder skeleton under `docs/research/assets/<category>/{paywalled,reference}/`. 37 of 47 paywalled queue PDFs retrieved (2 outstanding ILL: Strizyk 1983 and Oh 2000; 1 dropped as ghost citation: Mills 1999 DMCAST).

## Earlier

Pre-Graft-Spray history (pre-`cf68b1b`) lives on `main` at https://github.com/Graft-Systems/GraftWebsite/commits/main and is not catalogued here.
