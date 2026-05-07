# Graft Spray — Spec Amendment v2 (Pivot to Decision Intelligence)

**Status:** DRAFT — pending Benson approval before PR submission to `graft-spray/main`.
**Target file in repo:** `docs/spec/Graft-Spray-App-Spec.md` (Appendix A) and inline edits.
**Companion:** `docs/spec/CODEBASE_PLAN.md` Section 14 + Appendix A entries.

---

## A.0 Pivot Summary (verbatim into Appendix A)

The product center of gravity moves from a **per-photo computer-vision detector** to a **per-vineyard decision-intelligence aggregation hub**. Computer vision is preserved as an **optional Phase 3 scouting module** for "where in the field is it now?" — not a prevention input. The umbrella project goal is **unchanged, verbatim**:

> Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

Six new dossier categories now anchor the engineering surface:

- §08 Model Aggregation & Ensembling — `docs/research/08_model-aggregation.md`
- §09 Sensor Platform Integrations — `docs/research/09_sensor-integrations.md`
- §10 Satellite & Remote Sensing — `docs/research/10_satellite-remote-sensing.md`
- §11 Per-Tenant Agent Architecture — `docs/research/11_agent-architecture.md`
- §12 Recommendation Engine Patterns — `docs/research/12_recommendation-engine-patterns.md`
- §13 Advisory Feeds (Public/Government) — `docs/research/13_advisory-feeds.md`

---

## A.1 Inline edits to existing spec sections

### §1 Executive Summary — REPLACE
Graft Spray is a **per-vineyard mildew decision-intelligence hub**. It pulls every credible signal — mechanistic risk models (Gubler-Thomas, Caffi Primary/Secondary, DMCast, Mills, EPI, PLASMO, Magarey), public weather networks, satellite vegetation indices, on-vineyard sensors (Davis, Pessl, METER), and government advisories (UC IPM, BSV, INRAE, INTA, EPPO) — and emits a **daily spray verdict** (`spray` / `hold` / `scout`) with severity 1–10 for both powdery and downy mildew, a 7-day forecast, and **inline citations** to the model that fired, the data that triggered it, and the paper that underwrites the threshold. Optional Phase 3 module: in-field computer vision for outbreak localization once an outbreak is suspected.

### §5.5 Hybrid inference strategy — RETITLE + REWRITE
**Rename:** "§5.5 Model-runner orchestration".
Replace CV-centric edge+cloud framing with: containerized per-model runners (gubler_thomas, caffi_primary, caffi_secondary, dmcast, mills, plasmo, magarey, snyder_sall) each emitting the canonical `RiskRecord` schema. Ensemble layer fuses runners into a `BlockVerdict`. CV runner is one optional input, not the central one. See §11A.

### §6.3 Capture upload and severity grading — DEMOTE
Move under a new **"§6 Phase 3 flows (post-MVP)"** subsection. Keep content for future use; not in the M0–M2 critical path.

### §8.5 Capture and interpretation — DEMOTE
Same treatment: move into "§8 Phase 3 features" subsection. CV severity grading is no longer in the MVP.

### §8.9 Severity heatmap — REWRITE
Replace CV-driven severity heatmap with **risk heatmap** driven by the ensemble engine (§11A) + sensor (§12A) + satellite (§12B) inputs. Optional CV overlay returns in Phase 3.

### §10 ML / Computer Vision Pipeline — RETITLE + DEMOTE
**Rename:** "§10 Optional CV Scouting Module (Phase 3)". Keep all sub-section content (§10.1–§10.8) intact under this title with a 2-sentence preamble:

> **Phase 3 module — not in MVP.** Once a grower confirms a suspected outbreak (via advisory, model, or scout report), this module helps locate the affected zone in the field. It is a localization aid for crews, not a prevention signal — by the time mildew is visible, prevention has already failed.

### §11 Disease Forecasting Engine — EXPAND
Keep §11.1–§11.9 intact. Add forward reference at the top: "See §11A for how these models are aggregated, calibrated, and surfaced as a single verdict."

### §12 Weather and External Data Integration Layer — EXPAND
Keep §12.1–§12.6 intact. Add forward references to §12A (sensors), §12B (satellite), §12C (advisory feeds).

---

## A.2 New sections (insert after §11, §12, §13 respectively)

### §11A — Model Aggregation & Ensembling
**Source:** `docs/research/08_model-aggregation.md`

**§11A.1 Output contract.** Every model runner emits a `RiskRecord`:
```json
{
  "model_id": "gubler_thomas_2013",
  "model_version": "1.0.0",
  "block_id": "uuid",
  "valid_from": "2026-05-07T00:00:00Z",
  "valid_to": "2026-05-07T23:59:59Z",
  "pathogen": "powdery|downy",
  "severity_1_10": 6.4,
  "raw_score": { "ri": 80 },
  "thresholds_fired": [{ "name": "RI≥60", "citation_id": "06-S2" }],
  "input_snapshot_id": "sha256:…",
  "confidence": 0.78,
  "citation_id": "06-S1"
}
```

**§11A.2 Ensemble layer.** Fuses RiskRecords per block per day into a `BlockVerdict`:
```json
{
  "block_id": "uuid",
  "date": "2026-05-07",
  "powdery_severity_1_10": 6.5,
  "downy_severity_1_10": 4.2,
  "powdery_confidence": 0.74,
  "downy_confidence": 0.81,
  "action": "spray|hold|scout",
  "urgency": "now|24h|72h|none",
  "drivers": [
    { "model": "gubler_thomas_2013", "value": 80, "threshold": 60,
      "citation_id": "06-S1", "weight": 0.35 }
  ],
  "split_summary": "3 of 4 powdery models agree (high). Downy models split — Caffi flags 5.1, DMCast 3.0.",
  "forecast_7d": [ /* 7 daily verdicts */ ],
  "advisory_events": ["adv-uuid-…"],
  "model_versions": { "gubler_thomas": "1.0.0", "…": "…" },
  "generated_at": "2026-05-07T03:00:00Z",
  "audit_hash": "sha256:…"
}
```

**§11A.3 Progression.** Year 0: equal-weight soft vote. Year 1: weighted average tuned on labelled outcomes via Brier score minimization. Year 2+: stacked meta-learner (penalised logistic) with conformal prediction intervals on severity. (Source: `08_model-aggregation.md` §1, S1–S12.)

**§11A.4 Severity 1–10 anchors.** Powdery: GT RI 0–9 → 1, 10–19 → 2, …, 60+ → 7+, with adjustments for biofix and lethal-day rollback. Downy: Brischetto SEV thresholds banded into 1–10 with Mills Table corroboration. Anchor tables in `08_model-aggregation.md` §4 and `12_recommendation-engine-patterns.md` §6.

**§11A.5 Calibration.** On-vineyard leaf-wetness, canopy temp, on-site rainfall override nearest weather station via additive offset (Year 0) → Magarey energy-balance correction (Year 1) → Bayesian sequential update (Year 2). (`08_model-aggregation.md` §3.)

**§11A.6 Confidence surfacing.** Three layers: API number (standard deviation of model severities), traffic-light glyph (green/yellow/red on ensemble agreement), plain-English push notification. UI never shows a single severity without its confidence band when conformal intervals are live.

**§11A.7 Acceptance criteria.**
- Adding a new model runner is a 1-file addition + a registry entry.
- `BlockVerdict.audit_hash` is reproducible from the input snapshot + model versions + ensemble version.
- Disagreement (`split_summary`) is exposed to the grower verbatim, not hidden.

### §12A — Sensor Platform Integrations
**Source:** `docs/research/09_sensor-integrations.md`

**§12A.1 MVP partners (confirmed):**
- **Davis Instruments WeatherLink v2** — two-key auth (API Key + `X-Api-Secret`); polling only (no webhook); 1,000 calls/hr; multi-tenant via station-share to a central account; Pro/Pro+ subscriptions required for ≤5-min resolution and historical access; LW reported 0–15 needs normalization to minutes.
- **Pessl Instruments FieldClimate v2** — OAuth 2.0 partner app (right MVP path) or HMAC-SHA256 single-account; polling only; tiered limits 48/500/1500 req/station/day (Tier 2+ required for real-time); LW directly reported in **minutes** (model-ready).
- **METER Group ZENTRA Cloud v4 → v5 (2026)** — bearer token, organization-scoped; **native Push API** (HTTPS POST formdata), the only platform with webhook support; ATMOS-41 lacks native LW electrode (PHYTOS-31 add-on required); 60 calls/min total, 1 call/min/device (v4).

**§12A.2 Phase 2 partner:**
- **Sencrop** — OAuth 2.0 module-activation flow (best multi-tenant elegance); LW in minutes; JS SDK.

**§12A.3 Canonical sensor schema.** Every connector normalizes to:
```json
{
  "block_id": "uuid",
  "ts": "2026-05-07T03:00:00Z",
  "leaf_wetness_min": 14,
  "air_temp_c": 18.2,
  "rh_pct": 88,
  "precip_mm": 0.0,
  "wind_speed_ms": 1.4,
  "source": "davis|pessl|meter|sencrop",
  "device_id": "string",
  "quality_flag": "ok|estimated|gap_filled|stale|bad"
}
```

**§12A.4 Ingestion pattern.** Webhook-first for METER ZENTRA. 15-minute polling for Davis and Pessl. **Gap-fill rules:** if a station goes offline >4 h, fall back to NWS / ERA5-Land for the affected variables and mark `quality_flag = "gap_filled"`. The ensemble layer (§11A) reads `quality_flag` and reduces confidence accordingly.

**§12A.5 Onboarding UX.** Three first-class flows:
1. Pessl → OAuth handoff (cleanest)
2. Sencrop → OAuth handoff (Phase 2)
3. Davis + METER → API key + secret paste with copy-friendly error states; in-app validation against a smoke endpoint before saving.

**§12A.6 Acceptance criteria.**
- Each connector is its own package under `services/api/spray/connectors/sensors/<vendor>/` with a uniform interface.
- A station offline >4 h triggers a UI banner *and* lowers verdict confidence — never silently substitutes.
- Multi-tenant credentials are stored encrypted at rest + scoped per `org_id` per spec §17.1 + §20.4.

### §12B — Satellite & Remote Sensing
**Source:** `docs/research/10_satellite-remote-sensing.md`

**§12B.1 Honest scope.** Per Kanaley et al. 2024 [10-S8] no satellite VI reliably detects pre-symptomatic mildew. Satellite contributes **canopy vigor context, soil-moisture pre-conditioning, and post-symptomatic damage extent** — not prevention. UI must not imply otherwise.

**§12B.2 Phase-1 stack (free/low-cost).**
- **Sentinel-2 L2A** via **Copernicus Data Space Ecosystem (CDSE)** Statistical API
- **s2cloudless** for cloud masking
- **NDRE + NDWI** zonal statistics per block (median, P10, P90, CV)
- **ERA5-Land** for hourly weather back-fill
- **SMAP L4** for regional drought flag

**§12B.3 Per-block analytics pipeline.** GeoJSON parcel ingestion → daily zonal-stat job → time-series store → anomaly detection (Z-score, CUSUM, phenological trajectory matching) → ensemble engine (§11A) reads `vigor_anomaly_z` as a feature; advisory module reads `damage_extent_pct` post-outbreak.

**§12B.4 Scaling options.** Sentinel Hub Process API (paid, lower-latency tiles), Planet PlanetScope (3 m daily, paid; Cornell GDM study showed late-season-only detection [10-S8]), Sentinel-1 SAR (all-weather soil moisture), Google Earth Engine (compute-only, no commercial use without separate license).

### §12C — Advisory Feeds (Public & Government)
**Source:** `docs/research/13_advisory-feeds.md`

**§12C.1 Region inventory.**
- **California:** UC IPM PM Risk Index (live weekly RAI), CIMIS REST, UCCE Napa & Sonoma newsletters, CDPR CalPIP PUR, NPDN/WPDN listserv. (F01–F09)
- **Burgundy/Bordeaux:** BSV Vigne BFC weekly PDF, BSV Vigne Nouvelle-Aquitaine weekly PDF (file pattern `_YYYYMMDD.pdf`), IFV resistance note, ANSES e-Phy product registry, Météo-France AROME, Vigicultures. (F10–F17)
- **Mendoza:** INTA EEA Mendoza, SENASA registry (xlsx), SMN open data + REST, INV statistics. (F18–F21)
- **Global:** EPPO Reporting Service monthly, EPPO Global Database + PP1 standards, OIV technical docs, CABI Compendium (CC BY-NC-ND 4.0). (F22–F25)

**§12C.2 Unified advisory_event schema.**
```json
{
  "advisory_id": "uuid",
  "source": "uc_ipm|bsv_bfc|inrae|inta|eppo|oiv|…",
  "region": "ISO3166-2",
  "issued_at": "2026-05-07T08:00:00Z",
  "valid_through": "2026-05-14T23:59:59Z",
  "hazard_type": "powdery|downy|other",
  "severity": "low|moderate|high|extreme",
  "recommended_action": "string|null",
  "raw_url": "https://…",
  "license": "string",
  "language": "en|fr|es",
  "translated_text_en": "string",
  "ingested_at": "2026-05-07T09:00:00Z"
}
```

**§12C.3 Translation pipeline.** FR/ES → EN with terminology placeholder tokens (e.g. `__OIDIUM__` ↔ `powdery_mildew`) preserved through LLM translation, then re-substituted using the glossary. Glossary at `docs/research/glossary.md` is the canonical mapping.

**§12C.4 License compliance.** CABI Compendium portions are CC BY-NC-ND 4.0 — derivative works prohibited; we surface excerpts with attribution and a deep-link, never redistribute. EPPO PP1 standards are paid for full text — abstracts only.

### §13A — Per-Tenant Agent Architecture
**Source:** `docs/research/11_agent-architecture.md`

**§13A.1 Rejected: AgentMail-only.** AgentMail is real and works as imagined — millisecond inbox provisioning, SPF/DKIM/DMARC, webhooks. **But it is email plumbing only.** No LLM, no memory, no GDPR tooling. Pricing $100/mo (50 inboxes) → $500/mo (300 inboxes) → custom above 300.

**§13A.2 Recommended path (phased).**

| Phase | Orchestration | Memory | Email I/O | Notes |
|---|---|---|---|---|
| **Sprint 1 (≤10 farms)** | None — pure API | Postgres rows | None — in-app + push only | Get value loop working before frameworks. |
| **MVP (≤100 farms)** | LangGraph self-hosted | Postgres checkpoints | AgentMail | Email per farm = optional add-on. |
| **Growth (≤300 farms)** | LangGraph + Postgres RLS | Letta API ($0.10/active agent/mo) | AgentMail | Per-farm long-term memory becomes worth it. |
| **Scale (>300 farms)** | LangGraph on Kubernetes | Letta self-hosted (Apache 2.0) | Custom AWS SES | AgentMail pricing forces migration around 300 inbox threshold. |

**§13A.3 Tenant isolation.** Postgres Row-Level Security keyed on `org_id`; one agent context per `org_id`; agent system prompt receives only that org's data; data lake reads pass through the same RLS. Aligned with §17.4, §19, §20.4.

**§13A.4 Email-as-IO controls.** If AgentMail is enabled per tenant: per-org SPF/DKIM/DMARC managed by AgentMail; reply threading by `In-Reply-To`/`References`; spam classification monitored; legal disclaimer footer per §17.4 appended automatically; `email_inbound` and `email_outbound` events written to the audit log per §20.8.

**§13A.5 Acceptance criteria.**
- Agent code path is gated on `org.features.agent_enabled` — sprint-1 builds don't ship the agent runtime to disabled orgs.
- Switching memory backend (Postgres → Letta) is a config change, not a refactor.
- Switching orchestration framework is constrained to one package: `services/api/spray/agents/orchestrator/<framework>/`.

### §13B — Recommendation Engine: Patterns & Daily Card
**Source:** `docs/research/12_recommendation-engine-patterns.md`

**§13B.1 Daily verdict card schema.** See §11A.2 `BlockVerdict` — `BlockVerdict` *is* the daily card. UI consumes it; LLM may *render* it but never *originates* the numbers.

**§13B.2 Provenance.** Every `drivers[].citation_id` resolves to a row in `sources_master.csv` (or `advisory_events`) with full metadata. Every `BlockVerdict` is hashed (`audit_hash`) for tamper-evident audit log [12-S1].

**§13B.3 LLM-authored daily brief.**
- LLM produces only the *prose narrative*, never the numbers.
- Prompt is constrained: it sees `BlockVerdict` JSON and is told to render it verbatim, citing each numeric claim by `driver.citation_id`.
- Function-call-only output schema validates that every numeric claim appears in `drivers[]`.
- Post-hoc citation verifier (P-Cite per [12-S23]) re-checks every `[citation_id]` mention against the JSON before delivery.
- Hallucination guard: if any unsourced numeric claim is detected, fall back to a deterministic template.

**§13B.4 Liability framing (clinical-decision-support borrow).**
- Footer disclaimer on every recommendation surface (per §17.4).
- Signed onboarding acknowledgement that Graft Spray is *decision support, not decision making* — final call is the grower's PCA-licensed adviser where required.
- Audit log PDF exportable per session for grower's own records (per §20.8).
- FDA SaMD Criterion 4 framing — by always *showing the basis of a recommendation* (drivers + citations), Graft Spray operates as a non-device CDS, not a regulated medical-device analogue.

**§13B.5 Severity 1–10 stability.** Anchor tables (§11A.4) are versioned. When models update, `model_version` bumps but the 1–10 mapping function ships a backward-compatible mode for 90 days so grower mental models don't break overnight.

---

## A.3 CODEBASE_PLAN.md amendments

### Section 2 Target Tree — additions
```
services/api/spray/
  aggregation/                     # §11A ensemble layer
    runners/                       # one subpackage per mechanistic model
      gubler_thomas/
      caffi_primary/
      caffi_secondary/
      dmcast/
      mills/
      plasmo/
      magarey/
      snyder_sall/
    ensemble.py                    # weighted/stacked fusion + conformal intervals
    schemas.py                     # RiskRecord, BlockVerdict
  connectors/
    sensors/
      davis/                       # WeatherLink v2 polling
      pessl/                       # FieldClimate OAuth 2.0
      meter/                       # ZENTRA push + poll
      sencrop/                     # Phase 2 — scaffold only at MVP
    satellite/
      cdse/                        # Sentinel-2 Statistical API
      sentinel_hub/                # paid tier (Phase 2)
      earth_engine/                # research only (Phase 3)
    advisory/
      uc_ipm/
      cimis/
      bsv/                         # PDF parser
      inrae/
      inta/
      eppo/
      oiv/
      cabi/
  agents/
    orchestrator/
      langgraph/                   # MVP path
    memory/
      postgres/                    # MVP
      letta/                       # Growth
    email/
      agentmail/                   # MVP
      ses/                         # Scale
  recommendation/
    daily_brief/                   # LLM rendering + P-Cite verifier
    severity_anchors.py
    audit_log.py
docs/research/
  08_model-aggregation.md
  09_sensor-integrations.md
  10_satellite-remote-sensing.md
  11_agent-architecture.md
  12_recommendation-engine-patterns.md
  13_advisory-feeds.md
  pivot/PIVOT_AMENDMENT_PLAN.md
  pivot/SPEC_AMENDMENT_v2.md
```

### Section 5 Module-by-Module Milestone Allocation — insert M1.5
Insert between current M1 and M2:

**M1.5 — Aggregation MVP (decision-intelligence core)**
- M1.5-01 Implement `RiskRecord` and `BlockVerdict` schemas (`packages/types`)
- M1.5-02 Stand up at least 3 model runners: Gubler-Thomas, Caffi Primary, Caffi Secondary
- M1.5-03 Equal-weight ensemble (Year 0 soft vote) emits `BlockVerdict`
- M1.5-04 Davis WeatherLink connector (poll-only) + canonical sensor schema
- M1.5-05 Pessl FieldClimate connector (OAuth 2.0)
- M1.5-06 METER ZENTRA connector (Push API + poll fallback)
- M1.5-07 CDSE Sentinel-2 zonal-stat job (NDRE + NDWI per block)
- M1.5-08 UC IPM RAI scraper + advisory_event schema
- M1.5-09 BSV Vigne BFC + Nouvelle-Aquitaine PDF parser (Burgundy/Bordeaux soft-launch)
- M1.5-10 Daily brief renderer (deterministic template only — LLM brief gated to M2)
- M1.5-11 Audit-log writer for every BlockVerdict (`audit_hash`, model_versions, input snapshot id)

**M2 — iOS launch (existing) + LLM brief + agent runtime**
- M2 retains its existing iOS work, plus:
- M2-15 LLM-authored daily brief with P-Cite verifier
- M2-16 LangGraph orchestrator + Postgres checkpoint memory (per-tenant)
- M2-17 AgentMail per-org email enablement (feature-flagged)

**M3+ Phase 3 (CV scouting)**
- Existing §10 ML/CV pipeline content moves under M3 or later. Not in MVP critical path.

### Section 13 Risk Register — additions
- **R21 — Sensor vendor API churn.** Davis, Pessl, METER all version their APIs. Mitigation: vendor adapter pattern + contract tests + an "API version drift" CI alert.
- **R22 — Satellite quota overage.** CDSE Statistical API has rate caps; commercial Sentinel Hub tier costs scale with farm count. Mitigation: per-org quota meters + paid-tier upgrade trigger logged before user-facing degradation.
- **R23 — Model disagreement UX.** Growers may distrust the verdict if `split_summary` shows frequent disagreement. Mitigation: in-app onboarding explains ensembles; add "show me why" panel exposing every driver.
- **R24 — Agent architecture lock-in.** Picking AgentMail or Letta now and migrating later costs weeks. Mitigation: every external-runtime choice sits behind a thin adapter package; sprint-1 ships pure-API baseline so the agent runtime is purely additive.
- **R25 — Advisory feed scrape fragility.** BSV PDFs and INTA HTML change layouts. Mitigation: schema-validated parsers + golden-file regression tests + a fallback-to-manual ingest worker on parse failure.
- **R26 — Prescriptive-advice liability.** A wrong "hold" call costs the grower a crop. Mitigation: §13B.4 three-layer disclaimer + signed onboarding ack + audit log + non-device CDS framing per FDA SaMD Criterion 4.

### Section 14 Open Questions — additions

**Q15 — Recommendation output style.** RESOLVED 2026-05-07 by Benson: single daily verdict (`spray`/`hold`/`scout`) + 7-day forecast + severity 1–10 + inline citations. Dashboard is a secondary view, not the primary surface.

**Q16 — Agent architecture choice.** RESOLVED 2026-05-07 (research-driven, awaiting Benson sign-off): phased plan per §13A.2. AgentMail is a *capability*, not the architecture. Sprint 1 ships the pure-API baseline; LangGraph + Postgres checkpoints land in M2; Letta + RLS isolation come on at the growth phase.

**Q17 — Free-tier ceiling.** Pending Benson sign-off: keep CDSE free tier as long as throughput allows; budget a Sentinel Hub Statistical API paid tier check-in at M3. Letta API spend gated to organizations with >50 active blocks. AgentMail enablement is opt-in per org and disabled by default to avoid the $100/mo floor before paying customers materialize.

**Q18 — Sentinel-2 cloud-day fallback.** Open. When a block is cloud-covered for >2 consecutive Sentinel-2 revisits (10+ days), do we (a) hold the last good vigor metric, (b) substitute MODIS at coarser resolution, or (c) drop the satellite signal from the ensemble for that block until clear? Decision before M1.5-07.

**Q19 — METER PHYTOS-31 add-on requirement.** Open. METER ATMOS-41 lacks native leaf wetness; require PHYTOS-31 at onboarding for METER-only customers, or accept gap-filled LW from RH-based heuristic? Decision before M1.5-06.

---

## A.4 What this amendment does NOT change
- Umbrella project goal — verbatim, untouchable
- Auth provider (Clerk) — §20.3
- Routing decision (`graftsystems.com/spray/*` subpath) — §21
- Data lake (S3 + Iceberg/Delta Lake) — §9.5, §19
- Mobile stack (React Native + Expo, TypeScript)
- Geographic rollout (Napa/Sonoma → Burgundy → Bordeaux → Mendoza)
- Language priority (English → French → Spanish)
- Mandatory CODEBASE_PLAN.md as Claude Code's first PR — already shipped, this amendment lands on top
- §17.4 liability disclaimer — extended by §13B.4, not replaced

---

## A.5 PR plan
**Branch:** `graft-spray/m1/pivot-amendment` off `graft-spray/main`.
**Files:**
1. `docs/spec/Graft-Spray-App-Spec.md` — inline edits per §A.1; new §11A, §12A, §12B, §12C, §13A, §13B; Appendix A entry summarizing the pivot.
2. `docs/spec/CODEBASE_PLAN.md` — Section 2 target-tree adds, Section 5 M1.5 insertion, Section 13 R21–R26, Section 14 Q15–Q19.
3. `docs/research/08_…13_*.md` — six new dossier files (already in workspace).
4. `docs/research/00_index.md` — updated.
5. `docs/research/glossary.md` — pivot vocabulary section.
6. `docs/research/sources_master.csv` — 211 new rows already appended.
7. `docs/research/paywalled_queue.md` — pivot tags appended.
8. `docs/research/pivot/PIVOT_AMENDMENT_PLAN.md` + `SPEC_AMENDMENT_v2.md` — these planning docs.

**PDF regen:** Spec PDF rebuild scheduled as a follow-up PR after Benson signs off on the amendment; markdown ships first.
