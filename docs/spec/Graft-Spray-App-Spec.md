# Graft Spray — Application Specification

**Version:** 1.0 DRAFT
**Date:** 2026-04-30
**Status:** Draft. Sections 1 through 5 complete; sections 6 through 25 pending across subsequent commits on `graft-spray/m0/spec-pdf`.
**Companion documents:** [CODEBASE_PLAN.md](CODEBASE_PLAN.md), [CLAUDE_CODE_PLAN.md](CLAUDE_CODE_PLAN.md) (pending generation).
**Source brief:** [_source/original-spec-brief.md](_source/original-spec-brief.md).
**Research dossier:** [../research/](../research/) (read-only context).

---

## Table of Contents

1. Executive Summary
2. Umbrella Project Goal
3. User Personas and Jobs-to-Be-Done
4. Geographic and Language Rollout Plan
5. Platform Strategy
6. Core User Flows
7. Screen Inventory and Information Architecture
8. Feature Specification
9. Data Model and Schema
10. ML / Computer Vision Pipeline
11. Disease Forecasting Engine
12. Weather and External Data Integration Layer
13. Notification System
14. Tech Stack and Architecture
15. App Store Compliance Checklist (Apple)
16. Web MVP Compliance and Accessibility
17. Security, Privacy, and Liability
18. Analytics and Telemetry
19. Data Capture and Learning Pipeline
20. Account and Identity System
21. Graft Website Integration
22. Testing Strategy
23. Roadmap and Milestones
24. Open Questions and Risks
25. Appendix: Glossary, References, Source Map

---

## 1. Executive Summary

Graft Spray is a region-aware decision-support web application for grapevine growers. It combines weather modeling, computer-vision disease detection, and authoritative external risk indices to advise vineyard managers on the precise timing and product selection for fungicide applications targeting powdery mildew (*Erysiphe necator*) and downy mildew (*Plasmopara viticola*). The product is built for working vineyard conditions: outdoor readability, glove-friendly tap targets, and a core spray decision reachable in two taps from the home screen.

The umbrella project goal sets a strict commercial bar: tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying. Every feature in this specification supports that goal. Recommendations not only flag risk but also surface the projected savings versus a calendar-spray baseline, FRAC-rotation diversity, fungicide volume reductions, and pre-harvest interval (PHI) and re-entry interval (REI) compliance.

Graft Spray launches as a web application embedded inside the existing Graft Systems marketing site at `graftsystems.com/spray`. An iOS native app, built on React Native with Expo, follows in milestone M2 and is architected to extend to Android with no model rework when expansion is approved. The same Django plus Postgres plus PostGIS backend serves both surfaces through a shared OpenAPI-generated TypeScript client published as the `packages/client-core` workspace package.

The disease-forecasting engine implements three published peer-reviewed models locally: Gubler-Thomas powdery-mildew risk index with revised high-temperature thresholds [Brain 06_outbreak-prediction / P2], DMCast for downy mildew [Brain 06_outbreak-prediction / P5], and Mills-Table-based leaf wetness infection events [Brain 06_outbreak-prediction / P1, P3]. Spec amendment SA-1 augments these local computations by periodically aggregating live values from the authoritative public extension services that growers and university researchers rely on today: the UC IPM Grape Powdery Mildew Risk Assessment Index hosted at `ipm.ucanr.edu`, and the Oregon State USPest grape powdery mildew forecasting tool at `uspest.org`. When the local engine and the external feeds diverge by more than a configured threshold, the system flags the discrepancy for human review and prefers the authoritative source until a calibration check completes.

Image-based disease severity grading is handled by a hybrid inference architecture. On iOS, a lightweight on-device model (MobileNetV3 or EfficientNet-Lite, exported to TensorFlow Lite or ONNX) provides instant first-pass classification and severity scoring on a 1 to 10 scale aligned to the EPPO Standard PP 1/004 reference scale [Brain 01_visual-detection / P1]. A larger cloud model (ConvNeXt or EfficientNetV2 or Vision Transformer) provides a second-opinion grade with full disease-class probabilities and confidence scores. Web users go directly to the cloud model. Low-confidence captures from either path queue for human re-labeling and feed an active-learning loop on a per-region basis [Brain 01_visual-detection / P2, P3].

Geographic rollout proceeds Napa and Sonoma first, then Burgundy, then Bordeaux, then Mendoza, then global. Languages: English at launch, French at milestone M3 alongside Burgundy launch and GDPR readiness, Spanish at M5 alongside Mendoza. The application is architected for internationalization from day one via ICU message format, locale files, and right-to-left-safe layouts.

Distribution and identity are unified through Clerk for single sign-on across the marketing site and the authenticated Spray application. Every user-generated artifact (photo, video, polygon, spray record, recommendation accepted or rejected, chatbot interaction, weather observation, sensor reading, notification response) is captured into an append-only data lake on S3 partitioned by org, category, and date, with strict tenant isolation, KMS-managed encryption at rest, TLS 1.3 in transit, granular per-category consent toggles, and full per-user export and deletion paths to satisfy GDPR Article 6, CCPA, and Apple App Store Guideline 5.1.1(v) requirements.

This document specifies the application end-to-end so it can be implemented by Claude Code with no further design decisions required. Section 6 onward elaborates each pillar.

---

## 2. Umbrella Project Goal

> Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

This goal is fixed and is reproduced verbatim in this section, on the cover page, in the executive summary, and in the application's own onboarding copy. It is not paraphrased anywhere in this specification.

Three observations follow from the goal.

First, "when to spray and when not to" is symmetric. The application is as accountable for telling a manager to **hold** as it is for telling them to **spray**. A recommendation engine that only says "spray more" trains user distrust the moment the season's first dry streak rolls past without mildew pressure. The dashboard surfaces both the current risk window and the explicit holding window, both with the underlying weather and risk-index drivers cited in plain language.

Second, "prevent the spread of powdery and downy mildew" defines the disease scope at launch. Other grapevine diseases (Botrytis, Esca complex, leafroll, Pierce's disease, erineum mite) are not classified by the ML pipeline at launch and are not addressed by the disease-forecasting engine, although the data lake captures all imagery for future expansion. The reference dataset described in section 10 includes images of these other conditions to allow the cloud classifier to recognize and explicitly defer when an image is out-of-scope.

Third, "save money compared to indiscriminate spraying" is the commercial bar. Section 8.13 specifies a savings tracker that compares each block's recommended spray schedule and product mix to a calendar-spray baseline for the same region, and surfaces the dollar savings, fungicide volume saved, and FRAC-rotation diversity score [Brain 05_treatment-methods / P4, P6, P7, P8]. The savings figure is the product's primary growth metric: every dashboard load shows the year-to-date savings, and every successful spray-skip event raises it.

---

## 3. User Personas and Jobs-to-Be-Done

Four personas are addressed at launch. Each persona's primary jobs-to-be-done shape the screen inventory in section 7 and the role-based access model in section 20.

### 3.1 Owner-operator winegrower (small to medium vineyard)

Operates a single vineyard between roughly 5 and 50 acres. Hands-on with viticulture decisions; performs or directly supervises spraying. Highly cost-sensitive, often organic-only or transitioning. Mobile-first; the iPhone is in their pocket, the laptop is in the farmhouse office.

Jobs-to-be-done:
- Decide whether to spray today, given the forecast and the last spray's PHI and REI windows.
- Compare recommended spray cost vs. the calendar-spray baseline at season's end for tax filing and budgeting.
- Photograph a leaf or cluster suspicion and get an immediate second opinion on whether it is powdery or downy mildew or healthy.
- Hold a copy of every spray record for state regulatory compliance (California Pesticide Use Reports, the Burgundy *Cahier de phytosanitaire*, and so on).

### 3.2 Vineyard manager (larger commercial operation)

Manages 50 to 500 plus acres across multiple blocks for a wine producer or vineyard-management company. Coordinates a crew of applicators. Reports to a winery owner or general manager. Desktop-first for planning, mobile-first for field decisions. May manage multiple distinct vineyards under a single org.

Jobs-to-be-done:
- Plan the next 3 to 7 days of spray operations across all blocks, sequenced by risk and crew availability.
- Track FRAC-group rotation across all blocks to maintain resistance management [Brain 05_treatment-methods / P7, P8].
- Pull weekly cost and volume rollups by block and by product.
- Receive high-confidence push notifications when any block crosses into a moderate or high risk window.
- Delegate per-block read-write access to crew leads without granting org-wide admin rights.

### 3.3 Crew lead and sprayer applicator

Drives the sprayer rig, mixes products, executes the spray. May or may not be the same person as the vineyard manager. In the field, with gloves, frequently in low-light or high-glare conditions. Phone or tablet only.

Jobs-to-be-done:
- See today's spray plan at a glance, sorted by block and by product.
- Log a spray as completed in two or three taps, including product, rate, equipment, conditions at the time, and applicator identity.
- Photograph the leaf canopy mid-spray for quality-of-coverage records.
- Receive a real-time alert if conditions during the spray window drift out of label requirements (wind speed, temperature, relative humidity) [Brain 02_weather-impacts / P1].

### 3.4 Consultant and advisor (read-only)

University-extension advisor, independent crop consultant, or insurance loss adjuster. Does not own the vineyard but is granted scoped access to advise the owner. Heterogeneous device usage.

Jobs-to-be-done:
- Read every block's recommendation, risk-index history, capture history, and spray history.
- Add free-text annotations or "advisor notes" on captures and recommendations without modifying the operational records.
- Export a per-vineyard PDF report for the advisor's own files.

These four personas map to the four roles in the role-based access model defined in section 20: Owner, Admin, Member, and Viewer.

---

## 4. Geographic and Language Rollout Plan

The application launches region by region. Each region has its own gated bundle of data sources, regulatory compliance posture, and language coverage.

### 4.1 Region sequence

| Phase | Milestone | Region | Languages | Driver |
|---|---|---|---|---|
| 1 | M0–M1 | Napa County and Sonoma County, California | English | Primary launch market; UC IPM is the canonical regional risk index; CCPA applies; existing Graft network. |
| 2 | M3 | Burgundy, France | English + French | First international expansion; INRAE and Chambre d'agriculture data sources; GDPR applies; EU data residency required. |
| 3 | M4 | Bordeaux, France | English + French | Second French region; reuses Burgundy infrastructure; broadens language and compliance coverage. |
| 4 | M5 | Mendoza, Argentina | English + French + Spanish | Southern hemisphere expansion; INTA data sources; first Spanish-speaking region; first Latin American compliance posture. |
| 5 | M6+ | Global expansion | + per region | Region-by-region rollout based on demand and partner channels. |

### 4.2 Language strategy

English is the launch language. French follows at M3 (Burgundy) and Spanish at M5 (Mendoza). All UI strings flow through ICU message format from day one. Right-to-left layout safety is enforced by Tailwind CSS logical properties even though no RTL language is in the M0–M5 plan. Locale files live in `apps/web/locales/<lang>/<namespace>.json` for the web app and in `apps/mobile/locales/<lang>/<namespace>.json` for the iOS app, with a shared schema validated by a CI check.

Translation workflow: the development team writes English strings; a per-region partner (UC Extension contact for Napa, INRAE liaison for Burgundy, INTA Mendoza contact for Argentina) reviews region-specific terminology before launch. Machine translation is used as a baseline for non-English strings, then post-edited by the partner. Strings that include disease names, product names, regulatory terms, and units are flagged for partner review.

### 4.3 Region-aware data sources

Each region has its own canonical authority for weather data, risk indices, and pesticide registration. The Weather and External Data Integration Layer in section 12 abstracts provider selection so the same client code works regardless of region. The default provider for a vineyard's region is selected automatically when the vineyard is created and can be overridden by the org admin.

| Region | Default weather provider | Default risk-index source | Pesticide registry |
|---|---|---|---|
| Napa, Sonoma | Visual Crossing or Tomorrow.io | UC IPM Grape PM Risk Assessment Index (SA-1) [Brain 06_outbreak-prediction / P1, P2] | CDPR PUR via CalAgPermits |
| Burgundy, Bordeaux | Météo-France ICOS or Visual Crossing EU | INRAE Optidose / Mildiumagro [Brain 04_industry-publications / P1, P2, P3] | E-Phy registry (ANSES) |
| Mendoza | INTA Pampa or Tomorrow.io | INTA Mendoza models | SENASA registry |

### 4.4 Regional content service

Section 8.4 specifies a regional content service that scopes recommendations to the active vineyard's region. The service draws from two sources: the research dossier at `docs/research/` for canonical published guidance, and live feeds for region-specific bulletins (UC IPM news, INRAE alerts, INTA boletines). Feature gating uses the region of the active vineyard, not the region of the user, so a Bordeaux-based consultant advising a Mendoza grower sees Mendoza data.

---

## 5. Platform Strategy

Graft Spray ships on the web first (M0–M1) and on iOS second (M2). Android is explicitly out of scope at launch but the architecture preserves the option of activating it without model rework.

### 5.1 Web MVP (M0–M1)

The web application is the first surface. It launches as a route group inside the existing graftsystems.com Next.js 15 application using the App Router. Marketing pages live under `apps/web/app/(marketing)/` and the authenticated Spray application lives under `apps/web/app/(spray)/`. Section 21 specifies the integration in detail, including the new "Spray" entry in the marketing navigation, the `/spray` marketing landing page that gates login, and the `(spray)` route group that hosts the dedicated app shell.

The web MVP supports the full feature set in section 8 except where on-device ML inference is required. Cloud inference handles all severity grading from the web. Map polygon drawing uses MapLibre GL with open satellite imagery (Esri World Imagery or Sentinel-2) by default with Mapbox GL as a paid fallback if quality demands it; this decision is captured as Open Question Q4 in section 24.

### 5.2 iOS launch (M2)

Phase 2 is a native iOS application built on React Native and Expo. The choice of React Native is deliberate: a substantial fraction of the client code is shared with the web through `packages/client-core` (the OpenAPI-generated TypeScript client and React hooks) and `packages/ui` (design tokens and primitive components mapped through NativeWind or Tamagui). The same Postgres schema, Django REST API, FastAPI ML inference service, and Celery worker tier serve both surfaces.

iOS capabilities not present on web:
- On-device first-pass severity classifier using TensorFlow Lite or ONNX Runtime (`react-native-fast-tflite` is the preferred runtime; `onnxruntime-react-native` is the alternative). The model is the same lightweight backbone exported in two formats.
- Apple Sign In via `expo-apple-authentication` (per Apple Guideline 4.8 if any third-party SSO is offered).
- APNs push notifications via `expo-notifications`.
- Camera and gallery integration via `expo-camera` and `expo-image-picker`, with video support via `expo-av`.
- Offline buffering of captures and spray records via `expo-sqlite` plus `expo-secure-store` for token storage in the iOS Keychain.

Build and distribution: EAS Build (Expo Application Services) for iOS builds, EAS Submit for App Store delivery, EAS Update for over-the-air JavaScript updates within the constraints of App Store Guideline 4.7 (no behavior changes; bug fixes, content, and styling only).

### 5.3 Android (out of scope at launch)

Android is explicitly out of scope until further notice. The React Native codebase is kept Android-clean throughout: no iOS-only Expo modules without an Android equivalent, all platform-specific code in `.ios.ts` and `.android.ts` files where required, the New Architecture (Fabric and TurboModules) enabled from day one. The same TFLite or ONNX model shipped to iOS will run on Android with no model rework when the team decides to expand. Activating Android consists of enabling the Android target in EAS Build, configuring the Android signing keys, and adding Android-specific app store listings; no architecture work is required.

### 5.4 Backend platform-agnosticism

The backend (Django REST API, FastAPI ML inference, Celery workers, Postgres, PostGIS, S3, Iceberg or Delta Lake) is the same across all client surfaces. No backend code is web-specific or iOS-specific. The single OpenAPI specification at `services/api/openapi.yaml` generates the TypeScript client used by both `apps/web` and `apps/mobile`. Per spec amendment SA-1, the Celery worker tier hosts the new `external_risk_index.py` task that periodically aggregates UC IPM and uspest.org risk indices.

### 5.5 Hybrid inference strategy

The chosen inference strategy is **hybrid** for iOS and **cloud-only** for web. On iOS, the on-device model is a fast, privacy-preserving first pass; the cloud model is an accurate second-opinion. On web, browser constraints make practical deployment of any reasonably accurate disease-classification model infeasible at the model sizes required, so cloud inference is the only path. The same cloud model serves both surfaces.

Decision rules:
- Web user uploads a photo: cloud model returns `{powdery_prob, downy_prob, severity_1_to_10, confidence}`.
- iOS user takes a photo offline: on-device model returns the same shape with on-device latency. The result is shown immediately. When the device reconnects, the photo is uploaded; the cloud model re-grades; if the cloud severity differs from the on-device severity by more than a configured tolerance, the cloud value supersedes and a notification informs the user. The on-device confidence threshold is configurable per region.
- iOS user takes a photo online: on-device returns instantly; cloud is queried in parallel for second-opinion grading; the user sees the on-device result first and an updated final result within seconds.

The on-device model is updated through EAS Update; bundled weights are versioned alongside the JavaScript bundle. The cloud model is updated through standard backend deployment without an app-store re-review.

---

<!-- END OF DRAFT — sections 6 through 25 to be added in subsequent commits on graft-spray/m0/spec-pdf -->
