# Graft Spray — Pivot Amendment Plan

Purpose: Map the decision-intelligence pivot onto the existing spec (`docs/spec/Graft-Spray-App-Spec.md`, 1942 lines, 25 sections) and codebase plan (`docs/spec/CODEBASE_PLAN.md`) without rewriting from scratch.

## Pivot in one sentence
Graft Spray's center of gravity moves from **per-photo computer-vision detection** to a **per-vineyard decision-intelligence hub** that aggregates mechanistic mildew models, public weather, satellite, on-vineyard sensors, and government advisories into a daily spray verdict + 7-day forecast with cited reasoning.

## What stays unchanged
- §1 Executive Summary header (rewrite body only)
- §2 Umbrella project goal (verbatim, untouchable)
- §3 Personas
- §4 Geographic & language rollout (Napa/Sonoma → Burgundy → Bordeaux → Mendoza)
- §9 Data model (lake/operational store) — extend, don't replace
- §11 Disease forecasting engine — this is now the **core**, gets expanded
- §12 Weather/external data integration — this is now the **second core**, gets expanded
- §17 Security/privacy/liability
- §19 Data capture & learning pipeline
- §20 Account & identity (Clerk)
- §21 Website integration (subpath, locked in by Q5)
- §22 Testing strategy

## Sections that get rewritten or demoted
| Section | Current role | After pivot |
|---|---|---|
| §5.5 Hybrid inference strategy | CV-centric edge+cloud | Reframe around model-runner orchestration; CV is one optional runner |
| §6.3 Capture upload and severity grading | Core flow | Demoted to **Phase 3 scouting flow** ("find the spot, not predict the spread") |
| §8.5 Capture and interpretation | Core feature | Demoted to Phase 3 |
| §8.9 Severity heatmap | CV-driven | Reframed as **risk heatmap** driven by model ensemble + sensor + satellite, with CV overlays optional in Phase 3 |
| §10 ML / CV pipeline | Core | Demoted to **Phase 3 scouting module**; section retitled "Optional CV scouting module (Phase 3)"; existing content preserved |

## New sections to add
- **§11A Model Aggregation & Ensembling** — from research stream 1 (`08_model-aggregation.md`)
  - Sub-sections: ensembling theory, weighted vs Bayesian, calibration with local sensors, confidence surfacing, normalized risk-record schema, severity 1–10 mapping
- **§12A Sensor Platform Integrations** — from stream 2 (`09_sensor-integrations.md`)
  - Davis WeatherLink v2, Pessl FieldClimate, METER ZENTRA Cloud as MVP; Sencrop Phase 2
  - Onboarding UX (OAuth vs API-key paste), webhook-first vs poll-first, gap-fill fallback
- **§12B Satellite & Remote Sensing** — from stream 3 (`10_satellite-remote-sensing.md`)
  - Sentinel-2 + Sentinel Hub + Earth Engine, NDVI/NDRE/NDWI/SAR moisture, per-block zonal stats, cloud masking
- **§12C Public & Government Advisory Feeds** — from stream 6 (`13_advisory-feeds.md`)
  - UC IPM, Cornell NEWA, BSV Vigicultures, INRAE, INTA, EPPO, OIV
  - Normalized `advisory_event` schema, translation pipeline
- **§13A Per-Tenant Agent Architecture** — from stream 4 (`11_agent-architecture.md`)
  - AgentMail vs LangGraph vs CrewAI vs Letta vs OpenAI Assistants vs custom
  - Scoring matrix, recommended path, MVP vs scale phases
  - Email identity + deliverability if email-as-IO is selected
- **§13B Recommendation Engine — Patterns & Card Schema** — from stream 5 (`12_recommendation-engine-patterns.md`)
  - Daily verdict card schema (block_id, severity_powdery_1_10, severity_downy_1_10, action, drivers[], forecast_7d, audit_hash, citation_ids)
  - LLM-authored brief template with hallucination guardrails
  - Liability framing borrowed from clinical decision support

## CODEBASE_PLAN.md amendments
- **Section 2 Target Tree** — add:
  - `services/api/spray/aggregation/` (ensemble engine)
  - `services/api/spray/runners/` (containerized model runners: gubler_thomas, caffi_primary, dmcast, mills, …)
  - `services/api/spray/connectors/sensors/{davis,pessl,meter,sencrop}/`
  - `services/api/spray/connectors/satellite/{sentinel_hub,earth_engine}/`
  - `services/api/spray/connectors/advisory/{uc_ipm,bsv,inrae,inta}/`
  - `services/api/spray/agents/` (per-tenant agent runtime; specifics deferred to stream 4)
- **Section 5 Module milestones** — insert M1.5 "Aggregation & sensor MVP" between M1 and M2; demote ML training to M3+ (Phase 3 scouting module)
- **Section 13 Risk register** — add R21–R26 for: vendor sensor-API churn, satellite quota costs, model-disagreement UX, agent-architecture lock-in, advisory-feed scrape fragility, prescriptive-advice liability
- **Section 14 Open Questions** — add Q15–Q17:
  - Q15: Recommendation output style — single verdict vs dashboard vs both? (Already answered: single verdict + 7-day forecast)
  - Q16: Agent architecture choice — pending stream 4 recommendation
  - Q17: Free-tier ceiling for Sentinel Hub / Earth Engine before paid upgrade

## Research deliverables to fold in
- `08_model-aggregation.md` (stream 1)
- `09_sensor-integrations.md` (stream 2)
- `10_satellite-remote-sensing.md` (stream 3)
- `11_agent-architecture.md` (stream 4)
- `12_recommendation-engine-patterns.md` (stream 5)
- `13_advisory-feeds.md` (stream 6)
- Updated `00_index.md`, `sources_master.csv`, `paywalled_queue.md`, `glossary.md`

## What gets a PR vs. local commit
- Workspace dossier: written in `/home/user/workspace/graft-spray/research/` (already mounted)
- Repo edits: prepared as a single PR `graft-spray/m1/pivot-amendment` against `graft-spray/main`, containing:
  1. Spec amendments (Appendix A entry + inline edits to §5.5, §6.3, §8.5, §8.9, §10 demotion, plus new §11A/§12A/§12B/§12C/§13A/§13B)
  2. CODEBASE_PLAN.md amendments (target tree, milestones, risks, open questions)
  3. New `docs/research/0[8-9]*.md` and `1[0-3]*.md` files
  4. Updated `sources_master.csv`, `paywalled_queue.md`, `glossary.md`, `00_index.md`
- I will draft the PR locally; you sign off before I push.

## What I am explicitly not doing yet
- Not picking the agent architecture — waiting on stream 4
- Not removing CV section content — only demoting and retitling
- Not changing the umbrella goal (verbatim)
- Not pushing anything to GitHub without your sign-off
