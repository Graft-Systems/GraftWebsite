# Claude Code Directive — Graft Spray Pivot Amendment (v3)

**Date:** 2026-05-07
**Author:** Benson (with Computer assistance)
**Target branch base:** `graft-spray/main` (tip `9ca989c9`)
**Audit basis:** live read of `Graft-Systems/GraftWebsite` at 2026-05-07 09:34 PDT.

---

## 0. Read this first

This directive is **grounded in the repo as it actually stands today**, not the original spec assumptions. Specifics that matter:

- **M0 is essentially shipped.** Monorepo bootstrap (M0-01), Clerk auth (M0-02), website integration (M0-02a), PostGIS schema (M0-03), data lake ingest (M0-04), satellite map + polygon draw (M0-05), weather adapter + SA-1 risk-index aggregator (M0-06) are all merged to `graft-spray/main`. Confirmed by `CHANGELOG.md` and PRs #5, #6, #9, #10, #11, #13, #14.
- **M1-09 (capture upload web) is merged** as of PR #16. The `Capture` model exists, `CaptureUploader.tsx` ships, captures sit in S3 awaiting M1-10 inference. **This is the most important fact for the pivot:** photo capture is already on `main`.
- **PR #19 is open** (`graft-spray/m0/maplibre-draw-shim`) — a small MapLibre/Mapbox-Draw CSS shim. Merge it before this pivot work starts.
- **Two recent fixes (#17, #18)** unblocked first-org creation and Membership RLS. The current Membership RLS pattern is application-layer filtering; tenant-scoped tables (Vineyard, Block, DataLakeEvent, Capture) keep DB-level RLS. Don't undo this.
- **`services/api/spray/providers/` already exists** with a clean Protocol pattern (`WeatherProvider`, `ExternalRiskIndexProvider`) and four adapters (Visual Crossing, Generic CSV, UC IPM Grape PM, USPest Grape PM). This is the foundation we extend, not replace.
- **Schema registry already exists** at `services/api/spray/schemas/events/*` with 10 v1 schemas and CI validation via `scripts/check_event_schemas.py`. New event types must register here.
- **Celery beat schedule** runs `data_lake_etl` every 15min, `weather_pull` every hour, `external_risk_index` every hour. New scheduled work hooks here.

The pivot is therefore an **amendment**, not a rewrite. CV stays in the repo and isn't ripped out — it's reframed.

---

## 1. The pivot in one sentence

Graft Spray's center of gravity moves from **per-photo CV detection** to a **per-vineyard decision-intelligence aggregation hub** that fuses mechanistic mildew models, public weather, satellite vegetation indices, on-vineyard sensors (Davis/Pessl/METER), and government advisory feeds into a daily spray verdict + 7-day forecast with cited reasoning.

CV becomes a **Phase 3 scouting localization aid** — by the time mildew is visible to the human eye, prevention has already failed. M1-09 stays merged; M1-10 (cloud ML inference) gets repositioned, not deleted.

The umbrella project goal is **unchanged, verbatim**:

> Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

---

## 2. Decisions locked (do not relitigate)

| ID | Decision | Source |
|---|---|---|
| L1 | CV → Phase 3 scouting only. M1-09 stays. M1-10 retitles to "Optional CV Scouting Inference (Phase 3)" and slips behind M1.5 in priority. | Benson 2026-05-07 |
| L2 | MVP sensor partners: **Davis WeatherLink**, **Pessl FieldClimate**, **METER ATMOS-41/ZENTRA Cloud**. Sencrop = Phase 2. | Benson 2026-05-07 |
| L3 | Recommendation output = single daily verdict (`spray`/`hold`/`scout`) + 7-day forecast + severity 1–10 powdery + severity 1–10 downy + inline citations. Not a passive dashboard. | Benson 2026-05-07 |
| L4 | Per-tenant agent architecture is **one of several ideas** — survey-and-recommend, do not commit yet. Phased path documented in §13A of the new spec sections. | Benson 2026-05-07 |
| L5 | Umbrella goal stays verbatim. | Standing |
| L6 | Languages English → French → Spanish; rollout Napa/Sonoma → Burgundy → Bordeaux → Mendoza. | Standing |
| L7 | Routing remains `graftsystems.com/spray/*` subpath via Next.js parallel route groups. | Q5, resolved |
| L8 | Auth stays Clerk. | Q8, resolved |
| L9 | Membership RLS pattern (application-layer Membership filtering + DB-level RLS for tenant-scoped tables) stays. | PR #18 |

---

## 3. Required PRs (in this order)

### PR-A: pivot amendment, docs only
**Branch:** `graft-spray/m1/pivot-amendment-docs`
**Base:** `graft-spray/main`
**Mergeable goal:** documentation lands cleanly so engineering PRs can reference §11A/§12A/§13A by section number.

#### PR-A scope

1. **Update `docs/spec/Graft-Spray-App-Spec.md`** — surgical edits only:
   - **§1 Executive Summary** — replace with the rewritten body in `docs/research/pivot/SPEC_AMENDMENT_v2.md` §A.1.
   - **§5.5 Hybrid inference strategy** — retitle to "§5.5 Model-runner orchestration"; replace body per §A.1 of the amendment doc.
   - **§6.3 Capture upload and severity grading** — wrap content under a new H2 "§6.X Phase 3 capture flows (post-M1.5)". Do NOT delete existing prose.
   - **§8.5 Capture and interpretation** — same wrap-and-relabel under "§8.X Phase 3 capture features".
   - **§8.9 Severity heatmap** — replace with the ensemble-driven risk heatmap text from §A.1; keep existing CV overlay description as a Phase 3 sub-bullet.
   - **§10 ML / Computer Vision Pipeline** — retitle to "§10 Optional CV Scouting Module (Phase 3)" and prepend the 2-sentence preamble exactly as quoted in §A.1.
   - **§11 Disease Forecasting Engine** — keep §11.1–§11.9 verbatim; insert at the top: *"See §11A for ensemble fusion of these models into the daily verdict."*
   - **§12 Weather and External Data Integration Layer** — keep verbatim; add forward references to §12A (sensors), §12B (satellite), §12C (advisory feeds).
   - **Insert new sections §11A, §12A, §12B, §12C, §13A, §13B verbatim** from `docs/research/pivot/SPEC_AMENDMENT_v2.md` §A.2.
   - **Append a new entry to "Appendix A — Spec Amendments"**: ID **SA-2**, date 2026-05-07, summarizing the pivot in 2–3 paragraphs and linking to the new sections.

2. **Update `docs/spec/CODEBASE_PLAN.md`** per §A.3 of the amendment doc:
   - **Section 2 Target Tree** — add the new directories (aggregation/runners, connectors/sensors, connectors/satellite, agents/, recommendation/) listed in §A.3. Preserve everything already in Section 2.
   - **Section 5 Module-by-Module Milestone Allocation** — insert M1.5 rows between current M1 and M2 entries. Specifically:
     - `services/api/spray/aggregation/*` → M1.5 → `graft-spray/m1.5/aggregation-mvp`
     - `services/api/spray/connectors/sensors/davis/*` → M1.5 → `graft-spray/m1.5/sensor-davis`
     - `services/api/spray/connectors/sensors/pessl/*` → M1.5 → `graft-spray/m1.5/sensor-pessl`
     - `services/api/spray/connectors/sensors/meter/*` → M1.5 → `graft-spray/m1.5/sensor-meter`
     - `services/api/spray/connectors/satellite/cdse/*` → M1.5 → `graft-spray/m1.5/satellite-sentinel2`
     - `services/api/spray/providers/bsv_*.py` → M1.5 → `graft-spray/m1.5/advisory-bsv`
     - `services/api/spray/recommendation/*` → M1.5 → `graft-spray/m1.5/recommendation-card`
     - Move existing `services/ml/*` row from M1-10 to **M3** with a parenthetical "(Phase 3 CV scouting)".
   - **Section 13 Risk Register** — add R21–R26 from §A.3.
   - **Section 14 Open Questions** — add Q15 (resolved per L3), Q16 (resolved per L4 phased plan), Q17 (open — free-tier ceiling for CDSE / Letta / AgentMail), Q18 (open — Sentinel-2 cloud-day fallback), Q19 (open — METER PHYTOS-31 requirement).

3. **Copy the new dossier files** from the workspace at `/home/user/workspace/graft-spray/research/` (Computer environment) into the repo at `docs/research/`:
   - `08_model-aggregation.md`
   - `09_sensor-integrations.md`
   - `10_satellite-remote-sensing.md`
   - `11_agent-architecture.md`
   - `12_recommendation-engine-patterns.md`
   - `13_advisory-feeds.md`
   - `pivot/PIVOT_AMENDMENT_PLAN.md`
   - `pivot/SPEC_AMENDMENT_v2.md`
   - `pivot/CLAUDE_CODE_DIRECTIVE_v3.md` (this file)
   - Updated `00_index.md`
   - Updated `glossary.md`
   - Updated `sources_master.csv` (now 616 rows; preserve existing rows, append the 211 new ones)
   - Updated `paywalled_queue.md`

   **Asset folders** (`docs/research/assets/0[8-9]_*/` and `1[0-3]_*/`) are not required in PR-A — paywalled-paper PDFs can land in a follow-up `m1/research-pivot-pdfs` PR after the U-Mich library round-trip.

4. **Update `CHANGELOG.md`** with a new "Unreleased" entry titled "Pivot amendment: decision-intelligence aggregation hub" following the existing M-numbered convention.

5. **Do NOT in PR-A:**
   - Regenerate the spec PDF (`Graft-Spray-App-Spec.pdf`). PDF regen is its own follow-up PR after Benson approves the markdown amendment.
   - Touch any code under `apps/`, `services/`, `packages/`, or `infra/`. PR-A is documentation-only.
   - Delete or move the M1-09 `Capture` model, S3 imagery bucket, or `CaptureUploader.tsx`. They stay.
   - Modify `docs/spec/_plans/M1-09-plan.md`. M1-09 is shipped; rewriting its plan invites confusion.

#### PR-A acceptance criteria

- All four files (`Graft-Spray-App-Spec.md`, `CODEBASE_PLAN.md`, `CHANGELOG.md`, plus the six new research files) appear in the PR diff.
- `scripts/check_event_schemas.py` continues to pass (no schema changes in PR-A).
- `pnpm lint`, `pytest -q services/api`, `pnpm test -- --run` (web) all pass — they should not break since no code is touched.
- PR description surfaces Q17, Q18, Q19 as **blocking implementation work** but not blocking the docs merge.

---

### PR-B: schema registry — RiskRecord, BlockVerdict, AdvisoryEvent, SensorReading
**Branch:** `graft-spray/m1.5/aggregation-schemas`
**Base:** `graft-spray/main` (after PR-A merges)
**Goal:** the four new event/output schemas added to `services/api/spray/schemas/` and validated by CI, with no behavioral changes elsewhere.

#### PR-B scope

1. **New schemas** under `services/api/spray/schemas/events/`:
   - `risk_record/emitted/v1.json` — matches §11A.1 `RiskRecord` shape exactly. Fields: `model_id`, `model_version`, `block_id`, `valid_from`, `valid_to`, `pathogen` (enum: `powdery|downy`), `severity_1_10` (number 1.0–10.0), `raw_score` (object), `thresholds_fired` (array of `{name, citation_id}`), `input_snapshot_id`, `confidence` (0.0–1.0), `citation_id`.
   - `block_verdict/generated/v1.json` — matches §11A.2 `BlockVerdict` shape. Fields per §11A.2 verbatim. Make `forecast_7d[]` strictly 7 entries.
   - `advisory_event/ingested/v1.json` — matches §12C.2 `advisory_event`. Fields: `advisory_id`, `source`, `region` (ISO 3166-2), `issued_at`, `valid_through`, `hazard_type` (enum: `powdery|downy|other`), `severity` (enum: `low|moderate|high|extreme`), `recommended_action` (string|null), `raw_url`, `license`, `language` (enum: `en|fr|es`), `translated_text_en`, `ingested_at`.
   - `sensor_reading/ingested/v1.json` — matches §12A.3 canonical sensor schema: `block_id`, `ts`, `leaf_wetness_min`, `air_temp_c`, `rh_pct`, `precip_mm`, `wind_speed_ms`, `source` (enum: `davis|pessl|meter|sencrop`), `device_id`, `quality_flag` (enum: `ok|estimated|gap_filled|stale|bad`).

2. **Register the four new event types** in `services/api/spray/schemas/registry.py`. Mirror the existing pattern.

3. **Test additions** in `services/api/spray/tests/test_schema_registry.py`: one positive + one negative case per new schema.

4. **CI:** `scripts/check_event_schemas.py` must enumerate and validate the new schemas. Update the script if it hard-codes the schema list.

5. **Do NOT in PR-B:**
   - Add Django models for `RiskRecord`, `BlockVerdict`, `SensorReading`, `AdvisoryEvent`. Schemas land first; models follow in PR-C / PR-D / PR-E.
   - Wire any emitter calls. Producers come in later PRs.

#### PR-B acceptance criteria

- `pytest services/api/spray/tests/test_schema_registry.py` passes with new cases.
- `python scripts/check_event_schemas.py` exits 0 in CI.
- Schema files validate against draft-07 JSON Schema (already the project standard).

---

### PR-C: aggregation engine MVP — RiskRecord emitter + Year-0 ensemble
**Branch:** `graft-spray/m1.5/aggregation-engine-v0`
**Base:** `graft-spray/main` (after PR-B)
**Goal:** at least three model runners (Gubler-Thomas 2013, Caffi Primary, Caffi Secondary) emit `RiskRecord`s; an equal-weight ensemble fuses them into a `BlockVerdict` per block per day; `BlockVerdict` is persisted, hashed for audit, and emitted to the data lake.

#### PR-C scope

1. **Tree:** new package `services/api/spray/aggregation/`:
   - `aggregation/runners/__init__.py` — runner registry, mirrors `providers/registry.py` pattern.
   - `aggregation/runners/base.py` — abstract `ModelRunner` Protocol with `slug: str`, `version: str`, `pathogen: Literal["powdery","downy"]`, `citation_id: str`, `compute(block, weather_window) -> RiskRecord`.
   - `aggregation/runners/gubler_thomas/` — implements 2013 38°C revision per `docs/research/06_outbreak-prediction.md`. Equation lifted verbatim; cite `06-S2`.
   - `aggregation/runners/caffi_primary/` — primary infection model.
   - `aggregation/runners/caffi_secondary/` — secondary infection model.
   - `aggregation/ensemble.py` — Year-0 equal-weight soft vote, returns `BlockVerdict` with `split_summary` populated when σ(severities) > 1.0 on the 1–10 scale.
   - `aggregation/severity_anchors.py` — Powdery: GT RI banding to 1–10 per §11A.4. Downy: Brischetto SEV banding per `docs/research/12_recommendation-engine-patterns.md` §6.
   - `aggregation/audit.py` — computes `audit_hash = sha256(model_versions || input_snapshot_id || ensemble_version)`.

2. **Models:** add `RiskRecord` and `BlockVerdict` Django models to `services/api/spray/models.py`. Both tenant-scoped via `OrgScopedManager(via="block__vineyard__org_id")`. Migration `0008_aggregation_models`. RLS policies traverse `block → vineyard → org_id` exactly like Capture (M1-09).

3. **Worker task:** `services/worker/graft_worker/tasks/aggregation_run.py` — Celery beat schedule entry every hour for in-season vineyards (configurable via `GRAFT_SPRAY_AGGREGATION_CADENCE_SEC`, default 3600). Default region windows: Napa/Sonoma April–October (UTC).

4. **Lake events:** every `RiskRecord` emit and `BlockVerdict` generation writes a `DataLakeEvent` row using the schemas registered in PR-B.

5. **API endpoints:**
   - `GET /api/spray/orgs/<org>/blocks/<block>/verdicts/latest` — returns most recent `BlockVerdict` for the block.
   - `GET /api/spray/orgs/<org>/blocks/<block>/verdicts?since=<iso>` — paginated history.
   - Both protected by `IsOrgViewer`.

6. **No UI** in PR-C. `apps/web` ships a placeholder route `(spray)/recommendations/` that links to a "coming soon" stub. Real UI lands in PR-F.

7. **Tests** under `services/api/spray/tests/`:
   - `test_runner_gubler_thomas.py` — at least 3 fixture days covering RI bands 0–9, 30–39, 60+. Severity output must match anchor table within ±0.2.
   - `test_runner_caffi_primary.py`, `test_runner_caffi_secondary.py` — fixture-based.
   - `test_ensemble.py` — soft-vote averaging, split_summary triggers when σ > 1.0, confidence calculation.
   - `test_aggregation_audit.py` — `audit_hash` is stable, deterministic, changes when any input changes.
   - `test_verdict_endpoints.py` — RLS scoping, pagination, IsOrgViewer enforcement, 404 on missing block.

#### PR-C acceptance criteria

- `pytest -q services/api` passes.
- A smoke run on a seeded vineyard generates one `BlockVerdict` per block per day with deterministic `audit_hash`.
- Adding a 4th model runner is a 1-file addition + 1 registry-line addition (verify by adding a stub `mills_table` runner in the test suite that does not ship to prod).

---

### PR-D: sensor connector — Pessl FieldClimate (OAuth)
**Branch:** `graft-spray/m1.5/sensor-pessl`
**Base:** `graft-spray/main` (after PR-C)
**Why Pessl first:** OAuth 2.0 is the cleanest multi-tenant onboarding (per `09_sensor-integrations.md`), and Pessl reports leaf wetness directly in minutes (no normalization), making it the fastest path to a feedback-loop signal for the ensemble.

#### PR-D scope

1. **Tree:** `services/api/spray/connectors/sensors/pessl/` with `oauth.py`, `client.py`, `mapping.py`, `__init__.py`. Mirror the Protocol pattern of `services/api/spray/providers/`.
2. **Models:** `SensorAccount` (per-org credentials, encrypted), `SensorDevice` (per Pessl station), `SensorReading` (canonical schema). Migration `0009_sensor_models`. RLS policies tenant-scoped.
3. **Onboarding flow:** new `apps/web/app/spray/(app)/integrations/pessl/page.tsx` initiates OAuth handoff; Django callback at `/api/spray/integrations/pessl/oauth/callback`.
4. **Worker:** poll every 15 min per active device.
5. **Lake events:** every reading emits `sensor_reading.ingested` (PR-B schema).
6. **Tests:** OAuth happy-path, token refresh, rate-limit handling (429 → exponential backoff), per-org isolation.

#### PR-D acceptance criteria
- One smoke org can connect a real Pessl station (Benson coordinates the test station).
- Readings flow into `SensorReading`, `quality_flag` defaults to `"ok"`.
- The aggregation engine (PR-C) reads Pessl readings via `block.sensor_readings` and uses them in calibration when available.

---

### PR-E: sensor connector — Davis WeatherLink + METER ZENTRA
**Branch:** `graft-spray/m1.5/sensor-davis-meter`
**Base:** `graft-spray/main` (after PR-D)
**Goal:** parity with Pessl for the other two MVP partners. Davis = poll-only, two-key auth, LW normalization (0–15 scale → minutes via §3 of `09_sensor-integrations.md`). METER = bearer token + Push API webhook + poll fallback.

#### PR-E scope

1. **Two new connector packages** (`davis/`, `meter/`) following the Pessl shape from PR-D.
2. **Webhook endpoint** `POST /api/spray/integrations/meter/webhook` — verifies signature, ingests reading, idempotent.
3. **PHYTOS-31 onboarding gate** — if METER device lacks LW capability, surface in onboarding UI: "this station does not measure leaf wetness; we'll gap-fill from RH heuristic. Add a PHYTOS-31 sensor for higher-confidence verdicts." (See Q19 — pending Benson; ship UI as a non-blocking warning until decided.)
4. **Tests:** webhook signature verification, poll fallback when webhook silent >30 min, key rotation.

---

### PR-F: recommendation card UI + LLM daily brief
**Branch:** `graft-spray/m1.5/recommendation-card`
**Base:** `graft-spray/main` (after PR-E)
**Goal:** the verdict goes from "data on the backend" to "thing the grower sees".

#### PR-F scope

1. **`apps/web/app/spray/(app)/dashboard/page.tsx`** — block cards with severity dials, action verdict, urgency, drivers list with citation popovers.
2. **`apps/web/components/spray/VerdictCard.tsx`** — renders one `BlockVerdict`. Severity dual-bar (powdery + downy), action chip, "Why this verdict?" expander showing `drivers[]` with linked citations.
3. **LLM brief renderer** (`services/api/spray/recommendation/daily_brief.py`):
   - LLM sees `BlockVerdict` JSON only.
   - System prompt: "Render the verdict prose. Every numeric claim must reference a `driver.citation_id`. Do not invent numbers."
   - Function-call output schema enforces structure.
   - Post-hoc P-Cite verifier (per `12_recommendation-engine-patterns.md` §5) checks every citation marker resolves.
   - Hallucination guard: on verifier failure, fall back to a deterministic Jinja template — never ship unverified prose.
4. **Audit log download** at `/api/spray/orgs/<org>/blocks/<block>/audit-pdf?date=<iso>` — generates a PDF receipt of one verdict with full driver/citation transparency. (Liability framing per §13B.4.)
5. **Tests:**
   - `test_daily_brief.py` — LLM output passes P-Cite verifier on golden cases; falls back to template on injected hallucination.
   - Frontend: `__tests__/verdict-card.test.tsx` snapshot + accessibility.

---

### PR-G: Sentinel-2 zonal stats job
**Branch:** `graft-spray/m1.5/satellite-sentinel2`
**Base:** `graft-spray/main` (parallelizable with PR-D/E/F)
**Goal:** daily NDRE + NDWI per block from Sentinel-2 L2A via CDSE Statistical API (free), s2cloudless masking, ERA5-Land hourly fallback.

#### PR-G scope

1. New connector `services/api/spray/connectors/satellite/cdse/` — Statistical API client with cloud-mask masking.
2. Worker task `daily_zonal_stats` every 24h, fans out per active block.
3. Output: `BlockVigorTimeseries` (daily ndre, ndwi, vigor_anomaly_z) — plain Postgres, not the lake (low volume).
4. Aggregation engine (PR-C) reads `vigor_anomaly_z` as an optional input feature for ensemble weighting. Behind a feature flag until Q18 resolves.
5. Tests: stat API mock, cloud-day handling per Q18 (default: hold last good vigor for 10 days, then drop from ensemble).

---

### PR-H: advisory feeds — BSV PDF parser, INRAE, INTA
**Branch:** `graft-spray/m1.5/advisory-feeds-eu-ar`
**Base:** `graft-spray/main` (parallelizable)
**Goal:** four new providers join the existing UC IPM + USPest scrapers under the SA-1 pattern.

#### PR-H scope

1. New providers under `services/api/spray/providers/` following the existing `external_risk_index` Protocol:
   - `bsv_bourgogne_franche_comte.py` — weekly PDF scrape, parse vintage `_YYYYMMDD.pdf` filename pattern.
   - `bsv_nouvelle_aquitaine.py` — same pattern, different region.
   - `inrae_vigicultures.py` — JSON feed.
   - `inta_eea_mendoza.py` — HTML scrape.
2. Translation pipeline (`services/api/spray/translation/`) — FR/ES → EN with terminology placeholder tokens (`__OIDIUM__`, `__MILDIOU__`, `__OIDIO__`) preserved through LLM translation, re-substituted via glossary.
3. New `AdvisoryEvent` model. Migration `0010_advisory_event`. Lake event `advisory_event.ingested` (PR-B schema).
4. Tests: golden-PDF regression, parse-failure fallback per R25 (write degraded row with `severity=low` + `parse_error` field), translation round-trip preserves terminology tokens.

---

## 4. Open questions Claude Code must NOT silently resolve

These have to come back to Benson before the relevant PR ships:

- **Q17** — free-tier ceiling for CDSE Statistical API, Letta API, AgentMail. Default in PR-G/PR-H: stay free-tier; surface usage warnings at 80% per provider per spec §10.
- **Q18** — Sentinel-2 cloud-day fallback (PR-G). Default: hold last good vigor 10 days, then drop from ensemble. Ship behind a feature flag.
- **Q19** — METER PHYTOS-31 leaf-wetness add-on requirement (PR-E). Default: non-blocking warning in onboarding, gap-fill via RH heuristic, mark `quality_flag="gap_filled"`.

Surface all three in every PR description that touches them, with explicit "BLOCKED ON BENSON" callouts if my decision changes the implementation.

---

## 5. What stays untouched by the pivot

| Area | Status |
|---|---|
| Clerk auth (M0-02) | unchanged |
| Subpath routing `/spray/*` | unchanged |
| PostGIS schema (M0-03) | extended, never replaced |
| Data lake / S3 / Iceberg (M0-04) | extended with new event types |
| Maps + polygon draw (M0-05, plus PR #19 shim) | unchanged |
| Visual Crossing weather provider (M0-06) | unchanged |
| UC IPM + USPest scrapers (M0-06b / SA-1) | unchanged — they become `advisory_event` producers in PR-H but the existing scraper code stays |
| Capture upload pipeline (M1-09) | unchanged — captures sit ready for Phase 3 CV scouting |
| Membership RLS pattern (PR #18) | unchanged |
| `WaitlistEntry` collection on `main` | unchanged (Q7) |
| Mobile (`apps/mobile/`) | unchanged — M2 still gated on Q13 |

---

## 6. Branch protection + review

- All pivot PRs require Benson's review. Do not auto-merge.
- Every PR description must:
  1. Link to this directive (`docs/research/pivot/CLAUDE_CODE_DIRECTIVE_v3.md`).
  2. Surface any open question (Q17/Q18/Q19) it touches.
  3. Include a "Manual prerequisites" section if Benson must do anything in Render / AWS / Pessl / Davis / METER / CDSE before the PR can merge.
  4. End with a "Notes" section flagging anything that surprised you during implementation.
- Use the existing `[PLAN ONLY, DRAFT]` PR-title convention from prior milestones for the planning commit, then drop the suffix when implementation lands.

---

## 7. If something in `SPEC_AMENDMENT_v2.md` conflicts with the live repo

Prefer the **live repo** and call it out in the PR description with line numbers and a proposed reconciliation. The amendment doc was written before the latest repo audit; minor drift is expected. Examples:

- Amendment doc shows `apps/web/app/(spray)/...` but the repo uses `apps/web/app/spray/(app)/...`. Use the repo path.
- Amendment doc references `(marketing)/spray/page.tsx` but the actual file is `apps/web/app/spray/page.tsx`. Use the repo path.
- Amendment doc names sub-paths under `services/api/spray/connectors/` but `services/api/spray/providers/` already exists. Decide whether the new `connectors/` namespace coexists with `providers/` or whether sensor connectors should sit alongside the existing providers. **Recommendation:** keep `providers/` for *external read-only feeds we don't own* (weather, advisory) and use `connectors/sensors/` for *vendor APIs the customer authenticates against* (Davis/Pessl/METER). State this in the PR-A description so Section 2 of the codebase plan reflects the convention.

---

## 8. What to paste into Claude Code

Copy this entire file into the Claude Code task prompt. Then add the line:

> Begin with PR-A (docs only). Do not start PR-B until PR-A is merged. Do not commit anything to `graft-spray/main` directly — every change goes through a feature branch and a PR.

Done. Ready when you are.
