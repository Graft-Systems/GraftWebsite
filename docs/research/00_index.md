# Graft Spray Research Dossier — Master Index

**Umbrella Project Goal:** Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

This dossier is the **living brain** of the Graft Spray application. Every claim is traceable to a primary source. Open-access citations use `[S#]`; paywalled citations use `[P#]` and are aggregated in [`paywalled_queue.md`](paywalled_queue.md) for batch retrieval through University of Michigan library credentials.

---

## Status Overview

- **Categories complete:** 7 of 7 brain categories + business addendum
- **Total sources catalogued:** 405 (358 open access, 47 paywalled)
- **Master CSV:** [`sources_master.csv`](sources_master.csv)
- **Paywalled queue:** [`paywalled_queue.md`](paywalled_queue.md)

---

## Brain Categories

| # | Category | File | Open | Paywalled | Total |
|---|---|---|---|---|---|
| 01 | Visual Detection | [`01_visual-detection.md`](01_visual-detection.md) | 30 | 4 | 34 |
| 02 | Weather Impacts | [`02_weather-impacts.md`](02_weather-impacts.md) | 46 | 9 | 55 |
| 03 | Live Weather Feeds | [`03_live-weather-feeds.md`](03_live-weather-feeds.md) | 57 | 4 | 61 |
| 04 | Industry Publications | [`04_industry-publications.md`](04_industry-publications.md) | 50 | 4 | 54 |
| 05 | Treatment Methods | [`05_treatment-methods.md`](05_treatment-methods.md) | 43 | 5 | 48 |
| 06 | Outbreak Prediction | [`06_outbreak-prediction.md`](06_outbreak-prediction.md) | 32 | 10 | 42 |
| 07 | Miscellaneous Supporting Docs | [`07_miscellaneous.md`](07_miscellaneous.md) | 53 | 5 | 58 |

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

## Cross-Category Connections

- **§02 Weather Impacts ↔ §03 Live Weather Feeds:** §02 sets the variables we need (temperature, RH, leaf wetness, rainfall); §03 inventories which providers actually deliver them.
- **§02 Weather Impacts ↔ §06 Outbreak Prediction:** the empirical thresholds in §02 are the scientific basis for the mechanistic model equations in §06.
- **§03 Live Weather Feeds ↔ §06 Outbreak Prediction:** Gubler-Thomas, Caffi, DMCast all need hourly T/RH/LW. Provider selection per region is gated by leaf-wetness availability.
- **§01 Visual Detection ↔ §06 Outbreak Prediction:** ML image models from §01 feed the recommendation engine alongside the mechanistic forecasts in §06.
- **§01 Visual Detection ↔ §05 Treatment Methods:** confirmed disease + severity from §01 maps to product selection (curative vs. protectant) in §05.
- **§04 Industry Publications ↔ §05 Treatment Methods:** FRAC rotation rules and PHI/REI tables in §04 are enforced by the recommendation engine that consumes the §05 product catalog.
- **§07 Miscellaneous ↔ all categories:** mapping standards, GPS accuracy, compliance requirements, and outdoor UX guidance shape every product surface.
