# Graft Spray Research Dossier — Master Index

**Umbrella Project Goal:** Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

This dossier is the **living brain** of the Graft Spray application. Every claim is traceable to a primary source. Open-access citations use `[S#]`; paywalled citations use `[P#]` and are aggregated in [`paywalled_queue.md`](paywalled_queue.md) for batch retrieval through University of Michigan library credentials.

---

## Status Overview

- **Categories complete:** 13 of 13 brain categories + business addendum
- **Pivot status (2026-05):** Computer vision (§01) demoted to optional Phase 3 scouting module. Decision-intelligence aggregation hub is now the core thesis. Six new categories (§08–§13) added.
- **Total sources catalogued:** 616 (551 open access, 65 paywalled)
- **Master CSV:** [`sources_master.csv`](sources_master.csv)
- **Paywalled queue:** [`paywalled_queue.md`](paywalled_queue.md)
- **Pivot amendment plan:** [`pivot/PIVOT_AMENDMENT_PLAN.md`](pivot/PIVOT_AMENDMENT_PLAN.md)

---

## Brain Categories

| # | Category | File | Open | Paywalled | Total | Pivot Role |
|---|---|---|---|---|---|---|
| 01 | Visual Detection | [`01_visual-detection.md`](01_visual-detection.md) | 30 | 4 | 34 | **Phase 3** scouting only |
| 02 | Weather Impacts | [`02_weather-impacts.md`](02_weather-impacts.md) | 46 | 9 | 55 | Core — model thresholds |
| 03 | Live Weather Feeds | [`03_live-weather-feeds.md`](03_live-weather-feeds.md) | 57 | 4 | 61 | Core — provider catalog |
| 04 | Industry Publications | [`04_industry-publications.md`](04_industry-publications.md) | 50 | 4 | 54 | Core — DSS prior art |
| 05 | Treatment Methods | [`05_treatment-methods.md`](05_treatment-methods.md) | 43 | 5 | 48 | Core — product catalog |
| 06 | Outbreak Prediction | [`06_outbreak-prediction.md`](06_outbreak-prediction.md) | 32 | 10 | 42 | **Core — engine** |
| 07 | Miscellaneous Supporting Docs | [`07_miscellaneous.md`](07_miscellaneous.md) | 53 | 5 | 58 | Core — UX/compliance |
| 08 | Model Aggregation & Ensembling | [`08_model-aggregation.md`](08_model-aggregation.md) | 32 | 6 | 38 | **NEW — pivot core** |
| 09 | Sensor Platform Integrations | [`09_sensor-integrations.md`](09_sensor-integrations.md) | 38 | 2 | 40 | **NEW — pivot core** |
| 10 | Satellite & Remote Sensing | [`10_satellite-remote-sensing.md`](10_satellite-remote-sensing.md) | 30 | 5 | 35 | **NEW — pivot core** |
| 11 | Per-Tenant Agent Architecture | [`11_agent-architecture.md`](11_agent-architecture.md) | 29 | 0 | 29 | **NEW — pivot core** |
| 12 | Recommendation Engine Patterns | [`12_recommendation-engine-patterns.md`](12_recommendation-engine-patterns.md) | 30 | 5 | 35 | **NEW — pivot core** |
| 13 | Advisory Feeds (Public/Gov) | [`13_advisory-feeds.md`](13_advisory-feeds.md) | 34 | 0 | 34 | **NEW — pivot core** |

## Category Summaries

### 01 — Visual Detection

[`01_visual-detection.md`](01_visual-detection.md) · 30 open + 4 paywalled = **34 sources**

Reference imagery for powdery and downy mildew across leaves, berries, shoots; side-by-side disease and look-alike comparisons; severity-scale mapping; 8 labeled image datasets evaluated for ML training (PlantVillage, INRAE/IMS Merlot, HERMOS, NGLD Niphad, PlantDoc, GDCNet, IDADP, Embrapa WGISD). Key gap: no public dataset maps to a 1–10 severity scale covering both diseases simultaneously — GDCNet 7-level is closest starting point.

### 02 — Weather Impacts

[`02_weather-impacts.md`](02_weather-impacts.md) · 46 open + 9 paywalled = **55 sources**

Quantified weather thresholds for both diseases: PM optimum 25°C germination / lethality 38°C/2h (Peduto 2013); DM range 4–30°C with 21°C optimum; full Modified Mills Table for ascospore infection; DM minimum 2h leaf wetness at 21°C; PM 85% RH optimum; DM ≥80% RH sporulation trigger; rainfall thresholds (>2.5–10 mm DM primary infection); UV/shade effects (2–3× PM severity in shade); microclimate, canopy, climate-change projections per region.

### 03 — Live Weather Feeds

[`03_live-weather-feeds.md`](03_live-weather-feeds.md) · 57 open + 4 paywalled = **61 sources**

23 weather-data providers evaluated. Critical bottleneck: leaf wetness duration native or derived in only 9 — Visual Crossing (CART), Meteomatics (leaf_wetness:idx), Davis/METER/Adcon/Onset/Sencrop/Pessl hardware, Cornell NEWA, UC IPM. Per-region recommended stacks; $0/month MVP path via Open-Meteo + Visual Crossing free tiers + ECMWF ERA5; Mendoza identified as hardest region (no public LW source).

### 04 — Industry Publications

[`04_industry-publications.md`](04_industry-publications.md) · 50 open + 4 paywalled = **54 sources**

Full landscape of grower-facing spray decision resources: UC Davis Powdery Mildew Risk Index with full algorithm and spray-interval table; Cornell NEWA DMCast; OSU/WSU/Penn State/VT extension; French BSV bulletins, IFV Décitrait/EPICURE/OSCAR, INRAE Mildium DSS (30–50% spray reduction); ICVV Spain; INTA Mendoza; AWRI lag-phase control; NZ Winegrowers Marlborough thresholds. Commercial DSS table covering DMCast, RIMpro, VitiMeteo, EPI, MILVIT, Vintel, Sectormentor, eVineyard, Pessl FieldClimate, Sencrop. Full FRAC resistance table; PHI/REI tables for California, EU, Argentina.

### 05 — Treatment Methods

[`05_treatment-methods.md`](05_treatment-methods.md) · 43 open + 5 paywalled = **48 sources**

Comprehensive product catalog (60+ products) by FRAC group; sulfur and copper protocols with phytotoxicity thresholds (>85–90°F sulfur; EU 4 kg Cu/ha/yr limit); biological controls (Bacillus, Ampelomyces, Trichoderma, Reynoutria, bicarbonates); cultural controls; emerging methods (UV-C, RNAi, electrostatic, drone, nano); organic/biodynamic-compliant programs; 2019+ trial results. EU mancozeb ban 2020; US grape mancozeb cancellation proposed 2024; France copper limited to 2 products post-Jan 2026.

### 06 — Outbreak Prediction

[`06_outbreak-prediction.md`](06_outbreak-prediction.md) · 32 open + 10 paywalled = **42 sources**

The forecasting engine recipe: full equations and decision rules for Gubler-Thomas (1994 + 2013 38°C revision), Modified Mills Table, Snyder-Sall PMI, DMCast, EPI (Strizyk 1983), PLASMO/Goidanich, Caffi Primary + Secondary mechanistic Plasmopara models, RIMpro structure, Magarey generic infection model. Modern ML: YOLOv5-CA (89.55% mAP), GDCNet (5.08 MB lightweight), gradient-boosting Bordeaux (AUC 0.86, 50%+ treatment reduction), TabPFN+Sentinel-2, VineAI (89.6–93.7%). Pseudocode for daily spray-decision engine. MVP recommendation: Gubler-Thomas + Caffi Primary + Caffi Secondary.

### 07 — Miscellaneous Supporting Docs

[`07_miscellaneous.md`](07_miscellaneous.md) · 53 open + 5 paywalled = **58 sources**

Notification/alerting best practices (12–24 h spray-window lead time, 3–5/day fatigue threshold); vineyard mapping standards (GeoJSON RFC 7946, PostGIS WGS84+UTM, AgGateway ADAPT, ISO 11783-10 ISOXML); GPS accuracy (3–5 m smartphone, 2–4 cm RTK); spray equipment (airblast 500–1000 L/ha, drone FAA Part 107/137, ASABE droplet classes); compliance by region (CA DPR 14 fields + monthly submission, US WPS, EU Reg 2023/564 mandatory electronic by 2026, France registre numérique 2027, Argentina SENASA); outdoor UX (≥1000 nits, 7:1 contrast, 60 dp gloved targets); applicator licensing and FRAC-group PPE matrix.

---

## Business Addendum (NOT part of the app brain)

### Competitive Landscape & Market

[`../business/competitive-landscape.md`](../business/competitive-landscape.md) · 47 open + 6 paywalled = **53 sources**

14 direct competitors (Sectormentor, eVineyard, RIMpro, VitiMeteo, Vintel, VineView, Wildeye, Sencrop, Pessl Metos, Agrii Contour, Process2Wine, Cropler, VitiScribe, VineForecast); 7 adjacent competitors; hardware sensor landscape; market sizing — global 7.1 M ha vineyard area, $1.6–1.71 B grape fungicide market 2024, Phase-1 Napa+Sonoma TAM $5.1 M at $48/acre/year; pricing model benchmarks; distribution channels per region; regulatory & liability landscape (CA PCA license #1 risk, EU SUD, France Loi Duplomb 2026, Argentina SENASA, Apple 1.4.1); 5 strategic recommendations. Key finding: no competitor combines validated PM+DM models, CA DPR compliance, transparent per-acre SaaS, and zero-hardware onboarding.

---

## Pivot Category Summaries

### 08 — Model Aggregation & Ensembling

[`08_model-aggregation.md`](08_model-aggregation.md) · 32 open + 6 paywalled = **38 sources**

How to fuse Gubler-Thomas, Caffi Primary/Secondary, DMCast, Mills, EPI, PLASMO, Magarey into a single per-block daily verdict + 7-day forecast. Ensembling theory (Shah 2021 plant-disease specific, Bayesian Model Averaging, stacking, conformal prediction). Commercial DSS dissection (RIMpro, VitiMeteo/Agrometeo 9-yr validation, MISFITS-DSS Italy 88% balanced accuracy — closest published precedent). Calibration with on-vineyard sensors. Two JSON schemas defined: `RiskRecord` (per-model emit) and `BlockVerdict` (ensemble out, includes confidence + 7-day forecast + split summary when models disagree). Recommended progression: Year 0 equal-weight soft vote → Year 1 calibrated weighted average → Year 2+ stacking + conformal.

### 09 — Sensor Platform Integrations

[`09_sensor-integrations.md`](09_sensor-integrations.md) · 38 open + 2 paywalled = **40 sources**

Deep dive on the three confirmed MVP sensor partners. **Davis WeatherLink v2** — two-key auth, leaf-wetness 0–15 scale needs normalization, polling only (no webhook), 1,000 calls/hr, station-share for multi-tenant. **Pessl FieldClimate v2** — OAuth 2.0 partner app is the right MVP path, leaf wetness reported in **minutes** (model-ready), tiered limits 48/500/1500 req/station/day. **METER ZENTRA Cloud v4/v5** — only platform with **native Push API** (HTTPS POST), ATMOS-41 lacks native LW electrode (PHYTOS-31 add-on), v5 migration coming 2026. Sencrop Phase 2 (best multi-tenant elegance via OAuth module activation). Recommended architecture: webhook-first for ZENTRA, 15-minute polling for Davis + Pessl. Canonical schema with `leaf_wetness_min`, `air_temp_c`, `rh_pct`, `precip_mm`, `quality_flag`. Gap-fill with NWS/ERA5 when station offline >4h.

### 10 — Satellite & Remote Sensing

[`10_satellite-remote-sensing.md`](10_satellite-remote-sensing.md) · 30 open + 5 paywalled = **35 sources**

Honest finding: **no satellite VI reliably detects pre-symptomatic mildew** (Kanaley et al. 2024); satellite is for canopy-vigor context, soil-moisture pre-conditioning, and post-symptomatic damage extent — not prevention. Phase-1 stack: Sentinel-2 L2A + s2cloudless (CDSE Statistical API, free) + NDRE/NDWI per-block zonal stats + ERA5-Land hourly back-fill + SMAP regional drought flag. Mission tradeoffs: Sentinel-2 (10 m, 5-day, primary), Planet PlanetScope (3 m daily, paid, Cornell GDM study showed late-season detection only), Sentinel-1 SAR (all-weather soil moisture). Atmospheric correction: prefer pre-computed L2A (Sen2Cor 84%) or MAJA (91%) for European regions. AgroShadow (Matese lab) for vineyard shadow detection.

### 11 — Per-Tenant Agent Architecture

[`11_agent-architecture.md`](11_agent-architecture.md) · 29 open + 0 paywalled = **29 sources**

**AgentMail is real and works as imagined** but is *email plumbing only* — no LLM, no memory, no GDPR tooling. Pricing: $100/mo (50 inboxes) → $500/mo (300 inboxes) → custom. Recommended hybrid path: **MVP** = AgentMail (email I/O) + LangGraph self-hosted (orchestration) + Postgres checkpoints (memory). **Growth** = LangGraph + Postgres RLS (tenant isolation) + **Letta API** at $0.10/active agent/month for per-farm persistent memory + AgentMail until ~300 farms threshold forces SES migration. **Scale** = Custom AWS SES + LangGraph on Kubernetes + Letta self-hosted (Apache 2.0). **Pure-API baseline first sprint regardless** — get 10 farms working with simple prompt assembly before adding framework complexity.

### 12 — Recommendation Engine Patterns

[`12_recommendation-engine-patterns.md`](12_recommendation-engine-patterns.md) · 30 open + 5 paywalled = **35 sources**

Provenance + explainability (RAG with tamper-evident audit logging, SHAP, decision-tree fallback). Ag DSS prior art (RIMpro 30-min risk indicator, Cornell NEWA 31 tools, UC IPM Gubler-Thomas RI bands, VineForecast/Metos California Risk Model, Brischetto 2021 P. viticola SEV thresholds 87% negative-prognosis reliability). Clinical decision-support transferable lessons (UpToDate GRADE, IBM Watson Health four failure modes, FDA SaMD criterion 4 — *showing the basis of a recommendation* is what keeps the system in non-device CDS territory). Liability framing (three-layer disclaimer: footer + signed onboarding ack + audit log PDF). LLM brief patterns (constrained decoding, P-Cite over G-Cite for high stakes, FRONT fine-grained citation grounding, actor-critic hallucination loop). Severity 1–10 anchor tables for both pathogens. Full daily verdict JSON schema specified.

### 13 — Advisory Feeds (Public & Government)

[`13_advisory-feeds.md`](13_advisory-feeds.md) · 34 open + 0 paywalled = **34 sources**

25 public feeds catalogued across the four rollout regions. **California (F01–F09):** UC IPM PM Risk Index live weekly RAI, CIMIS REST API, UCCE Napa & Sonoma newsletters, CDPR CalPIP PUR data, NPDN/WPDN listserv. **Burgundy/Bordeaux (F10–F17):** BSV Vigne BFC + Nouvelle-Aquitaine weekly PDFs, IFV resistance note, ANSES e-Phy product registry, Météo-France AROME, Vigicultures. **Mendoza (F18–F21):** INTA EEA Mendoza, SENASA registry, SMN open data, INV statistics. **Global (F22–F25):** EPPO Reporting Service monthly, EPPO Global Database, OIV technical docs, CABI Compendium. Unified `advisory_event` schema (13 fields). Translation pipeline FR/ES → EN with terminology placeholder tokens + glossary integration.

---

## Cross-Category Connections

### Forecasting core
- **§02 Weather Impacts ↔ §03 Live Weather Feeds:** §02 sets the variables we need (temperature, RH, leaf wetness, rainfall); §03 inventories which providers deliver them.
- **§02 Weather Impacts ↔ §06 Outbreak Prediction:** the empirical thresholds in §02 are the scientific basis for the mechanistic model equations in §06.
- **§03 Live Weather Feeds ↔ §06 Outbreak Prediction:** Gubler-Thomas, Caffi, DMCast all need hourly T/RH/LW. Provider selection per region is gated by leaf-wetness availability.

### Pivot aggregation layer
- **§06 Outbreak Prediction ↔ §08 Model Aggregation:** §06's mechanistic models are the inputs; §08 specifies how to fuse them into a single verdict and how to express disagreement.
- **§08 Model Aggregation ↔ §12 Recommendation Engine:** §08's `BlockVerdict` schema feeds §12's daily verdict card schema; severity 1–10 anchors are agreed between them.
- **§09 Sensor Integrations ↔ §06 + §08:** raw on-vineyard signals normalize into the canonical schema, calibrate model outputs (§08 §3), and improve confidence vs station-only data.
- **§10 Satellite ↔ §08 Ensemble:** satellite vegetation indices contribute spatial weighting and canopy density correction; explicitly *not* a primary mildew signal.
- **§13 Advisory Feeds ↔ §12 Recommendation Engine:** government bulletins add institutional weight and citations to the daily brief; `advisory_event` schema flows into `drivers[]`.

### Architecture & UX
- **§11 Agent Architecture ↔ §19 Data Lake / §20 Account System (spec):** per-tenant agent memory must respect data lake tenant isolation, GDPR/CCPA per-user export, and granular consent.
- **§01 Visual Detection ↔ §10 Satellite + §06:** demoted CV becomes *post-detection localization* for scout teams — answers "where in the block is it?" once an outbreak is suspected, not "will it happen?".
- **§04 Industry Publications ↔ §08 Aggregation:** RIMpro, VitiMeteo, Vintel are now competitors *and* model-fusion exemplars (MISFITS-DSS most aligned).
- **§05 Treatment Methods ↔ §12 Recommendation Engine:** FRAC rotation rules + PHI/REI gates the action recommendation.
- **§07 Miscellaneous ↔ all:** mapping standards, GPS accuracy, compliance, outdoor UX shape every product surface.
