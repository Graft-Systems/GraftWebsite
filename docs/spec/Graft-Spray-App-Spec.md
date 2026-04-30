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

## 6. Core User Flows

The application's two most important flows are reachable in two taps from the home screen. Both flows assume the user is already authenticated and has at least one block.

### 6.1 Onboarding to first recommendation

![Onboarding to first recommendation](diagrams/user-flow-onboarding.png)

The full first-time-user journey from clicking "Spray" in the Graft marketing nav to seeing the first recommendation card on the dashboard. Target completion time: under 5 minutes.

Steps:
1. Visitor clicks "Spray" in the Graft Systems marketing navigation. Routes to `/spray` marketing landing page (per section 21).
2. Visitor clicks "Log in or Sign up" CTA. Clerk-hosted auth flow opens (signup with email + password, or Sign in with Apple, or Google OAuth).
3. Visitor verifies email (and phone if used for SMS notifications later).
4. Visitor accepts terms of service and privacy policy. Granular consent toggles are presented per category (per section 19): "use my photos for model training," "use my spray records for benchmarks," "share anonymized aggregate insights." Each can be off while the app still works.
5. Visitor creates an Org. The first user becomes the Owner. Owner role requires MFA (TOTP or passkey/WebAuthn) before the Org is fully provisioned.
6. Visitor enters the onboarding wizard:
   - Step A: search for the vineyard's address. Map zooms to satellite view.
   - Step B: draw the vineyard outline polygon. The app snaps to existing parcel boundaries where Esri or Sentinel-2 imagery offers them.
   - Step C: subdivide into one or more Blocks. Label each (e.g., "North Block, Cab Sauv 2018").
   - Step D: enter planted variety, training system, row spacing per Block (optional but recommended; affects severity calibration).
   - Step E: connect a weather data source. Default selection is region-aware (Visual Crossing for Napa/Sonoma; Météo-France for Burgundy). The user can override.
7. Visitor takes the first capture: photo of a leaf or cluster from any Block. Web users use the file picker or drag-drop; iOS users use `expo-camera`. Cloud inference returns severity 1 to 10 with disease class probabilities and confidence within roughly 2 to 4 seconds.
8. The dashboard renders the first recommendation card for that Block, derived from the active risk index, the just-uploaded capture's severity, and the user's preferred-product list (which defaults to a region-appropriate starter set).

### 6.2 Two-tap spray decision from home

![Two-tap spray decision](diagrams/user-flow-spray-decision.png)

The home screen lists Blocks as cards. Each card shows the current risk level (low / moderate / high), the most recent capture severity if any, and a "Recommendation" pill ("Spray now" / "Hold" / "Spray within 2 days").

Tap 1: home, tap a Block card, route to the Block detail screen.

Tap 2: visible at the top of the Block detail is the Recommendation card. Tap "Spray now" to log a planned spray (opens the spray-log entry form pre-filled). Tap "Hold" to acknowledge the recommendation.

A secondary single-tap path exists via push notifications: when a Block crosses into moderate or high risk, the device receives a push notification; tapping the notification opens directly to the Block's Recommendation card.

### 6.3 Capture upload and severity grading

The capture flow is reachable from any Block detail screen via a prominent "Capture" button.

Steps:
1. User taps "Capture." Web: file picker opens. iOS: camera opens with `expo-camera`.
2. User takes one or more photos (or videos, M2+). Multi-photo upload aggregates per cluster: averaging predictions across N images of the same cluster yields a calibrated single-cluster severity. The aggregation policy is documented in section 10.
3. Upload progresses with a queue indicator. Offline iOS captures buffer in `expo-sqlite`.
4. iOS only: on-device first-pass returns severity 1 to 10 immediately.
5. Cloud inference returns the authoritative result within seconds (online) or after reconnection (offline iOS).
6. The Capture detail screen shows the photo(s), the prediction, and a "Confirm or Correct" UI. The user can override the disease class and severity; corrections persist as `MLCorrection` records and feed the active-learning loop in section 10.

### 6.4 Spray log entry

Reachable from the Block detail screen ("Log spray") or from any Recommendation card ("Spray now").

Steps:
1. Form pre-fills with the recommended product, rate, and target disease.
2. User confirms or edits product (drop-down sourced from the user's preferred-product list with a search-everything fallback).
3. User confirms or edits rate, equipment, applicator identity, weather conditions at the time (optional auto-fill from the active weather source).
4. User taps "Log." Spray record persists to `SprayRecord`. PHI and REI countdowns start. Push notifications and dashboard banners suppress for the affected block during the REI window.

### 6.5 Recommendation acceptance and outcome tracking

Each recommendation served carries a unique `Recommendation.id`. When the user logs a spray that the recommendation flagged, the recommendation is auto-linked. Otherwise the recommendation expires after its validity window (typically 48 to 72 hours). The application tracks `RecommendationOutcome`: was the recommendation followed; was a disease event observed within the next 7 days; what was the savings vs. the calendar baseline. This data feeds the recommendation engine's per-region calibration.

---

## 7. Screen Inventory and Information Architecture

The authenticated app is organized into a persistent left sidebar with eight top-level destinations and a top bar with org switcher, notifications, and user menu. The unauthenticated marketing site is unchanged except for the added "Spray" entry. Section 21 details the boundary.

### 7.1 Authenticated app shell

| Sidebar item | Path | Primary content |
|---|---|---|
| Dashboard | `/spray/dashboard` | At-a-glance: today's recommendations, year-to-date savings, active risk windows, recent captures, FRAC-rotation status. |
| Vineyards | `/spray/vineyards` | List of vineyards in the active org. CRUD, archival. |
| Map | `/spray/map` | Full-screen satellite map; polygon drawing; risk heatmap overlay; per-block details panel. |
| Captures | `/spray/captures` | Photo and video library. Filter by block, by date, by disease class, by severity, by ML-correction status. |
| Recommendations | `/spray/recommendations` | Active and historical recommendations. Filters by block and outcome. |
| Spray log | `/spray/spray-log` | Spray records. CSV import for legacy records. PHI / REI tracking. Per-block and per-product rollups. |
| Integrations | `/spray/integrations` | Connect external weather feeds, sensor streams, lab data. Manage preferred-product list. |
| Chatbot | `/spray/chatbot` | Gemini-backed assistant. RAG-grounded over the research dossier and the user's own data. |
| Settings | `/spray/settings` | Org settings, members, billing, notification preferences, consent toggles, data export, account deletion. |

### 7.2 Top bar

- Org switcher (left): for users who belong to multiple orgs.
- Notifications bell (center-right): unread count; dropdown lists recent alerts.
- User menu (right): profile, log out, log out from all devices, switch org, "Back to Graft Systems" link (opens marketing homepage in a new tab per section 21).

### 7.3 Marketing surface (unchanged behavior)

The existing marketing navigation gains a single new item, "Spray." All other marketing pages (Home, About, Tool, Contact) are untouched. The marketing footer remains. Inside the authenticated `(spray)` route group, the marketing chrome (top nav, footer, marketing-style hero sections) is replaced by the app shell. Section 21 specifies the boundary in detail.

### 7.4 Outdoor-readability requirements

All authenticated screens must meet outdoor-readability minimums [Brain 07_miscellaneous / P2, P4]:
- Minimum text contrast ratio 7:1 (AAA).
- Minimum tap target 44x44 points (Apple HIG; matches the spec's MIT Touch Lab fingertip-width reference).
- Sticky primary actions stay within thumb reach in portrait orientation.
- High-contrast mode automatically engaged when ambient light sensor (iOS) reports above a threshold or when the user explicitly toggles the "field mode" switch (web).

---

## 8. Feature Specification

The 13 must-have features below are carried forward verbatim in intent from the source brief. For each feature: description, user story, acceptance criteria, screens involved, data dependencies, API contracts, edge cases, dossier reference, and the data lake events emitted (per section 19).

### 8.1 Super easy to use

**Description.** Core spray decision reachable in 2 taps from home. Onboarding completes in 5 minutes. Outdoor-readable UI with high contrast and large tap targets.

**User story.** As a vineyard manager standing in the field with gloves on, I can decide whether to spray Block 3 today within 5 seconds of unlocking my phone.

**Acceptance criteria.**
- From a cold home-screen load (logged in, at least one block defined), the user can tap one Block and see "Spray now / Hold" within 2 taps.
- Onboarding flow (per section 6.1) median time is under 5 minutes for users with their vineyard address ready.
- All primary action buttons render at minimum 44x44 points.
- Color contrast meets WCAG 2.2 AA minimum (4.5:1) for normal text and AAA (7:1) for "field mode."

**Screens involved.** Dashboard, Block detail.

**Data dependencies.** `Block`, `Recommendation` (latest active per block).

**API contracts.** `GET /api/spray/dashboard` returns the home-screen card data.

**Edge cases.** No active recommendation for a block: card shows "No active risk; next index recompute at HH:MM." No blocks at all: dashboard shows the onboarding CTA.

**Dossier reference.** Outdoor readability and tap-target sizing [Brain 07_miscellaneous / P2, P4].

**Data lake events emitted.** `dashboard.viewed`, `block.tapped`, `recommendation.viewed`.

### 8.2 Not complex

**Description.** Advanced settings hidden behind progressive disclosure. Defaults sensible per region.

**User story.** As a first-time user, I do not see FRAC group toggles, leaf-wetness sensor calibration, or risk-index threshold sliders during onboarding. They live under Settings, Advanced.

**Acceptance criteria.**
- Onboarding shows only the fields required to draw a block, label it, and connect a weather source.
- All risk-index thresholds default to region-appropriate published values [Brain 06_outbreak-prediction / P1, P2, P5] and are surfaced only under Settings, Advanced, Risk thresholds.
- Power users can override defaults; the override is persisted and surfaced in the per-block recommendation explanation.

**Screens involved.** Onboarding flow, Settings.

**Data dependencies.** `Org.settings`, `Block.settings`.

**API contracts.** `PATCH /api/spray/orgs/:id/settings`, `PATCH /api/spray/blocks/:id/settings`.

**Edge cases.** Org-level setting vs. block-level override: block-level wins.

**Data lake events emitted.** `settings.changed` with `level=org|block` and the diff.

### 8.3 Apple App Store listing readiness

**Description.** Full Apple compliance per section 15.

**Acceptance criteria.** Section 15's checklist passes in full.

(Cross-reference to section 15.)

### 8.4 Live regional documentation

**Description.** Region-aware content service (per section 4.4) pulls from the research dossier and live regional feeds; recommendations are scoped to the active vineyard's region.

**User story.** As a Burgundy grower, my spray recommendations cite INRAE Optidose sources and obey French E-Phy registry constraints, even if my advisor is in California.

**Acceptance criteria.**
- Recommendations cite at least one canonical source per region.
- Region detection follows the active vineyard's geocoded centroid, not the user's IP.
- Live feeds (UC IPM news, INRAE alerts, INTA boletines) refresh hourly; stale-flag if older than 24 hours.

**Screens involved.** Block detail (citation footer), Recommendation detail.

**Data dependencies.** `Vineyard.region`, `ResearchDocument`, regional feed adapters in `services/worker/tasks/`.

**API contracts.** `GET /api/spray/regions/:region/sources`, `GET /api/spray/regions/:region/bulletins`.

**Edge cases.** Region not yet supported: app shows "your region is on the roadmap" with a link to the rollout plan in section 4.

**Dossier reference.** Per region: [Brain 04_industry-publications], [Brain 06_outbreak-prediction], [Brain 03_live-weather-feeds].

**Data lake events emitted.** `regional_source.served`, `regional_bulletin.fetched`.

### 8.5 Capture and interpretation

**Description.** Photo and video capture, cloud upload (with offline iOS buffering), severity grading on a 1 to 10 scale aligned to EPPO PP 1/004 [Brain 01_visual-detection / P1].

**User story.** As a crew lead, I take a photo of a suspicious leaf, and within seconds I see "Powdery mildew, severity 4/10, confidence 87%."

**Acceptance criteria.**
- Capture supports JPEG and HEIC photos; MP4 video at 720p.
- Web upload limit 25 MB per file; iOS upload chunks files larger than 5 MB.
- Cloud inference returns within 4 seconds at p95 for a single 1080p photo.
- iOS on-device inference returns within 1 second at p95.
- Severity scale: integer 1 to 10. Mapping to EPPO PP 1/004 reference photos is documented in section 10.
- Multi-photo cluster aggregation: when N photos of the same cluster are uploaded together, the average prediction is the calibrated single-cluster severity.

**Screens involved.** Capture, Capture detail, Block detail.

**Data dependencies.** `Capture`, `MLPrediction`, `MLCorrection`.

**API contracts.** `POST /api/spray/captures` (multipart, up to 10 files), `GET /api/spray/captures/:id`, `POST /api/spray/captures/:id/correct`.

**Edge cases.** Out-of-scope image (e.g., Botrytis, Esca, leafroll, soil): cloud model emits `disease_class=other` and the UI explains "this image is outside Graft Spray's launch scope; we logged it for future model expansion." Network failure on iOS: capture queues locally; retries on reconnect.

**Dossier reference.** EPPO PP 1/004 [Brain 01_visual-detection / P1]. GLDD dataset and ResNet-50 baselines [Brain 01_visual-detection / P3]. Hyperspectral severity calibration [Brain 01_visual-detection / P2].

**Data lake events emitted.** `capture.uploaded`, `ml.prediction.created`, `ml.correction.created` (when user overrides).

### 8.6 User-supplied resources and integrations

**Description.** Connect paid weather feeds, lab data, sensor streams. Upload legacy spray history (CSV or PDF). Curate preferred-products list.

**User story.** As a vineyard manager already paying for a Davis weather station and Sencrop sensor data, I connect both, and Graft Spray's risk index now uses my higher-resolution local data instead of the regional default.

**Acceptance criteria.**
- Integration types at launch: Davis WeatherLink, METER ATMOS-41, Sencrop, Pessl iMETOS, generic CSV import.
- CSV spray-history import: column mapping wizard, validation, preview, batch import. Supported source formats: state PUR exports, Vinpro CSV, generic Excel.
- Preferred-products list: search by FRAC group, by product, by mode of action; add or remove; mark organic-only [Brain 05_treatment-methods / P1, P6, P7].
- Connections are surfaced in the per-block recommendation explanation: "this recommendation uses your Davis WeatherLink station data, last refreshed 12 minutes ago."

**Screens involved.** Integrations, Spray log (for CSV import).

**Data dependencies.** `IntegrationConnection`, `WeatherStation`, `SprayRecord`, `Product`, `UserProductPreference`.

**API contracts.** `POST /api/spray/integrations`, `GET /api/spray/integrations/:id/test`, `POST /api/spray/spray-records/import`.

**Edge cases.** Failed CSV row: surfaced inline, user can edit and retry without re-uploading the whole file.

**Dossier reference.** [Brain 03_live-weather-feeds], [Brain 05_treatment-methods].

**Data lake events emitted.** `integration.connected`, `integration.disconnected`, `spray_history.imported`, `product_preference.updated`.

### 8.7 Targeted product suggestions

**Description.** Recommend specific products and rates per block, respecting preferred-products list, FRAC rotation, PHI, REI, and organic-only flags.

**User story.** As an organic grower in Sonoma, when my Block 2 crosses into moderate risk, I receive a recommendation for sulfur (FRAC M02) at the rate published in the UC IPM Grape Pest Management Guidelines, knowing it complies with my organic certification.

**Acceptance criteria.**
- Recommendations always cite the underlying weather and risk-index drivers in plain language.
- FRAC rotation enforced over a configurable window (default 14 days): no two consecutive recommendations use the same FRAC group.
- PHI and REI checks against the user's harvest target date and crew schedule.
- Organic-only flag filters product universe at recommendation time.

**Screens involved.** Recommendation detail, Block detail.

**Data dependencies.** `Recommendation`, `Product`, `UserProductPreference`, `RiskIndexRun`, `ExternalRiskIndex` (per SA-1).

**API contracts.** `GET /api/spray/recommendations?block_id=:id&active=true`, `POST /api/spray/recommendations/:id/acted_on`.

**Edge cases.** All preferred products in current FRAC rotation window: surface "no compliant product in your preferred list; here are 3 alternatives outside it" with one-tap add-to-preferred.

**Dossier reference.** FRAC rotation and resistance management [Brain 05_treatment-methods / P7, P8]. Copper and sulfur use in European viticulture [Brain 05_treatment-methods / P1].

**Data lake events emitted.** `recommendation.served`, `recommendation.acted_on`.

### 8.8 Spray schedule with explanations

**Description.** Per-block spray schedule for the next 7 days, ordered by block region and crew availability, with per-recommendation drivers explained.

**User story.** As a vineyard manager, on Monday morning I see this week's plan: Block 1 sprayed Tuesday with Product A (FRAC group 7) because Gubler-Thomas crossed 60 yesterday and the forecast shows a stormy Wednesday, Block 2 held until Friday because risk is currently low and the forecast is dry.

**Acceptance criteria.**
- Schedule view (table) shows Block, Day, Product, Rate, Reason.
- Each row links to the full recommendation explanation.
- Schedule re-computes when weather updates, when a capture lands, when external risk feeds (SA-1) update, or when a spray is logged.

**Screens involved.** Dashboard, Recommendations, Spray log.

**Data dependencies.** `Recommendation`, `Block`, `WeatherObservation`, `RiskIndexRun`, `ExternalRiskIndex`, `SprayRecord`.

**API contracts.** `GET /api/spray/schedule?org_id=:id&from=:date&to=:date`.

**Edge cases.** Crew availability not configured: schedule defaults to "any day in window." Conflicting recommendations across blocks (same crew, same hour): the schedule view flags conflicts.

**Dossier reference.** Decision-support systems [Brain 04_industry-publications / P1, P2].

**Data lake events emitted.** `schedule.computed`, `schedule.served`.

### 8.9 Severity heatmap

**Description.** Heatmap overlay on the satellite map showing per-block risk; "what to watch" widget for upcoming weather drivers.

**User story.** As an owner-operator scrolling the map, I see a red overlay on Block 3 and an amber on Block 5; tapping Block 3 shows the recommendation card.

**Acceptance criteria.**
- Heatmap colors derive from a single canonical risk-level scheme: green (low), amber (moderate), red (high).
- Color scale documented in the legend; same scale used in dashboard cards.
- "What to watch" widget surfaces the next 72 hours' weather drivers most likely to flip a block's risk level.

**Screens involved.** Map, Dashboard.

**Data dependencies.** `Block.geom`, `RiskIndexRun.risk_level`, `WeatherObservation` forecast.

**API contracts.** `GET /api/spray/map/heatmap?org_id=:id`.

**Edge cases.** Block missing recent risk-index run: rendered grey ("computing") with a recompute trigger button.

**Data lake events emitted.** `heatmap.rendered`.

### 8.10 Risk-window notifications

**Description.** Push and web push notifications when a block crosses into moderate or high risk. Per-block subscriptions, quiet hours, digest mode.

**User story.** As an owner-operator on a quiet Sunday, I receive a single 7am digest "3 of your blocks crossed into moderate risk overnight; recommended spray windows: Tuesday for Block 1, Wednesday for Blocks 2 and 5."

**Acceptance criteria.**
- Permission flow asks before enabling notifications; defaults to off.
- Per-block subscription (subscribe / unsubscribe / digest-only).
- Quiet hours respected per user (default 9pm to 6am local).
- Digest mode: bundle multiple block-level alerts into one notification per quiet-hours window or per configured cadence.
- Test harness for simulating high-risk events (admin only).

**Screens involved.** Settings, Notifications, Dashboard banner, Block detail.

**Data dependencies.** `Notification`, `NotificationEvent`, `Block.subscriptions`.

**API contracts.** `POST /api/spray/notifications/subscriptions`, `GET /api/spray/notifications`, `POST /api/spray/notifications/:id/acked`.

**Edge cases.** User has not granted browser push permission: app falls back to email alerts (off by default; opt-in).

**Dossier reference.** [Brain 06_outbreak-prediction / P2].

**Data lake events emitted.** `notification.sent`, `notification.opened`, `notification.acted_on`.

### 8.11 Gemini chatbot

**Description.** Gemini-backed assistant grounded by RAG over the research dossier and the user's own data. Safety guardrail for pesticide-recommendation queries.

**User story.** As a vineyard manager, I ask "what is UC IPM saying about my region this week?" and get a grounded answer with citations.

**Acceptance criteria.**
- RAG corpus: research dossier (`docs/research/` excluding `business/competitive-landscape.md`) plus the user's own captures, spray records, recommendations, and weather observations.
- Pesticide-recommendation queries route through a safety guardrail: "I cannot recommend a specific pesticide; please consult your local extension service for the legal product list in your region. Here is what the research dossier says about products in your region's general practice..."
- Responses always carry citations to the underlying source (Brain category, paywalled-vs-open source ID, or user's own record ID).
- Thumbs-up and thumbs-down feedback per response; feedback feeds RAG quality improvement.

**Screens involved.** Chatbot.

**Data dependencies.** Read-only access to the user's own data scoped by `org_id`; read-only access to `ResearchDocument`.

**API contracts.** `POST /api/spray/chat/sessions`, `POST /api/spray/chat/sessions/:id/messages`, `POST /api/spray/chat/messages/:id/feedback`.

**Edge cases.** Out-of-scope query (e.g., "what is the best wine to pair with sushi?"): the assistant declines politely and redirects to in-scope help.

**Dossier reference.** General [Brain 00_index].

**Data lake events emitted.** `chat.message.exchanged`, `chat.feedback.given`.

### 8.12 Satellite map and polygon save

**Description.** Highly detailed satellite map for drawing vineyard outlines. Save as distinct vineyards and blocks, GeoJSON, GPS-anchored. Each block has its own spray timeline.

**User story.** As an owner-operator, I draw three blocks on the satellite view, label them, and from then on each block has its own risk index, captures, recommendations, and spray log.

**Acceptance criteria.**
- Map default: MapLibre GL with Esri World Imagery or Sentinel-2; Mapbox GL fallback if quality demands (Open Question Q4 in section 24).
- Polygon drawing with snapping to existing parcel boundaries where available.
- Polygons saved as PostGIS `geometry(Polygon, 4326)` on the `Block` model.
- Per-block tools: rename, re-draw, archive, export GeoJSON.
- Edit history retained as immutable revisions for advisor and audit use.

**Screens involved.** Map, Vineyards, Block detail.

**Data dependencies.** `Vineyard`, `Block` (PostGIS), `ResearchDocument` (region-specific guidance).

**API contracts.** `POST /api/spray/blocks`, `PATCH /api/spray/blocks/:id`, `DELETE /api/spray/blocks/:id`, `GET /api/spray/blocks/:id/geom.geojson`.

**Edge cases.** User draws over open water or non-vineyard polygon: warning surfaces but does not block save.

**Dossier reference.** RTK GNSS accuracy for parcel-boundary work [Brain 07_miscellaneous / P1].

**Data lake events emitted.** `block.created`, `block.updated`, `block.deleted`, `vineyard.created`.

### 8.13 Savings tracker

**Description.** Compare recommended sprays vs. a calendar-spray baseline; surface dollar savings, fungicide volume saved, FRAC-rotation diversity score.

**User story.** As an owner-operator at season's end, I export a one-page PDF showing I sprayed 7 times instead of the regional 12-spray calendar baseline, saved $2,840 in product cost, and used three different FRAC groups.

**Acceptance criteria.**
- Calendar baseline per region defined and documented (e.g., 12 sprays per season for Napa per UC IPM Grape Pest Management Guidelines).
- Dashboard widget: year-to-date savings vs. baseline.
- Per-block and org-wide rollups.
- PDF export at season end.

**Screens involved.** Dashboard, Settings, Reports.

**Data dependencies.** `SprayRecord`, `Product` (for cost), region-specific calendar baselines (in `ResearchDocument` or hardcoded constants by region).

**API contracts.** `GET /api/spray/savings?org_id=:id&season=:year`, `GET /api/spray/savings/:org_id/export.pdf`.

**Edge cases.** First season (no baseline yet): savings tracker shows "estimated savings vs. regional baseline."

**Dossier reference.** PM and DM cost analyses [Brain business / P3, P4].

**Data lake events emitted.** `savings.computed`, `savings.exported`.

---

## 9. Data Model and Schema

![ER Diagram](diagrams/er-diagram.png)

### 9.1 Operational store (Postgres + PostGIS)

The full entity list is enumerated below. Field-level definitions land in `services/api/spray/models.py` (M0-03 PR). Indexes are called out where they materially affect performance.

| Entity | Purpose | Key fields | Indexes |
|---|---|---|---|
| `Org` | Tenant boundary | id, name, region, created_at, plan, settings (jsonb) | (id) primary, (name) |
| `User` | Authentication identity (mirrors Clerk) | id, clerk_user_id, email, phone, name, locale, created_at | (clerk_user_id) unique, (email) |
| `Membership` | Org-User-Role bridge | id, org_id (FK), user_id (FK), role (Owner/Admin/Member/Viewer), created_at | (org_id, user_id) unique |
| `Session` | Active session record | id, user_id, jwt_jti, device, ip, created_at, last_seen, revoked_at | (user_id, revoked_at) |
| `AuthEvent` | Immutable auth audit trail | id, user_id, type (login/logout/mfa_enable/...), ip, ua, outcome, created_at | (user_id, created_at) |
| `ConsentRecord` | Per-category consent toggle | id, user_id, category, granted (bool), granted_at, withdrawn_at | (user_id, category) |
| `Vineyard` | Vineyard property | id, org_id, name, region, address, centroid (geometry), created_at, archived_at | (org_id), GIST on centroid |
| `Block` | Sub-vineyard block | id, vineyard_id, name, geom (geometry(Polygon,4326)), variety, training_system, row_spacing, settings (jsonb) | (vineyard_id), GIST on geom |
| `WeatherStation` | Connected or virtual weather station | id, org_id (nullable for regional default), provider, station_id, lat, lon | (org_id), (provider, station_id) |
| `WeatherObservation` | Time-series observation | id, station_id, ts, temp, rh, leaf_wetness, wind_speed, precip, raw (jsonb) | (station_id, ts) |
| `ExternalRiskIndex` (SA-1) | Live risk index from public extension services | id, region, source (UC_IPM/USPEST/...), risk_index_value, risk_level, pulled_at, raw_payload (jsonb) | (region, source, pulled_at) |
| `RiskIndexRun` | Local computation per block per day | id, block_id, model (GUBLER_THOMAS/DMCAST/...), risk_index_value, risk_level, inputs (jsonb), computed_at | (block_id, model, computed_at) |
| `SprayRecord` | Logged spray | id, block_id, product_id, rate, equipment, applicator_id, target_disease, conditions (jsonb), sprayed_at, recommendation_id (nullable FK) | (block_id, sprayed_at) |
| `Product` | Fungicide catalog entry | id, name, manufacturer, frac_group, mode_of_action, phi_days, rei_hours, organic, registration_jurisdictions (jsonb) | (name), (frac_group) |
| `UserProductPreference` | Per-user curated product list | id, org_id, product_id, preferred (bool), notes | (org_id, product_id) unique |
| `Capture` | Photo or video upload | id, block_id, uploader_id, kind (photo/video), s3_key, size_bytes, taken_at, uploaded_at | (block_id, uploaded_at) |
| `MLPrediction` | Cloud or on-device prediction | id, capture_id (FK), model (BACKBONE/VERSION), powdery_prob, downy_prob, severity_1_to_10, confidence, created_at | (capture_id) |
| `MLCorrection` | User override of prediction | id, prediction_id, correcting_user_id, disease_class, severity_1_to_10, note, created_at | (prediction_id) |
| `Recommendation` | Per-block spray recommendation | id, block_id, target_disease, suggested_product_id, suggested_rate, valid_from, valid_until, drivers (jsonb), explanation_text, served_at | (block_id, served_at) |
| `RecommendationOutcome` | Did the user act, did disease ensue | id, recommendation_id, acted_on (bool), acted_at, observed_disease (nullable enum), savings_estimated | (recommendation_id) |
| `Notification` | Push or web push or email | id, user_id, channel, payload (jsonb), scheduled_for, sent_at | (user_id, scheduled_for) |
| `NotificationEvent` | sent / opened / acted_on | id, notification_id, type, occurred_at | (notification_id, type) |
| `IntegrationConnection` | External integration record | id, org_id, kind, config (jsonb encrypted), connected_at, last_pull_at, status | (org_id, kind) |
| `ResearchDocument` | Brain-dossier reference (manifest mirror) | id, category, ref_id, title, doi, file_path, ingested_at | (category, ref_id) unique |
| `ChatSession` | Chatbot session | id, user_id, org_id, created_at | (user_id, created_at) |
| `ChatMessage` | Individual exchange | id, session_id, role (user/assistant), content, citations (jsonb), feedback (1/-1/null), created_at | (session_id, created_at) |
| `DataLakeEvent` | Envelope for §19 capture | id, org_id (nullable), user_id (nullable), category, schema_version, payload (jsonb), created_at | (org_id, category, created_at) |

### 9.2 Tenant isolation

Every tenant-scoped row carries `org_id`. PostgreSQL row-level security (RLS) enforces tenant isolation at the DB layer. The Django ORM uses a custom manager that applies `org_id` filtering by default; tests verify no cross-tenant leak under any read path.

### 9.3 Indexing strategy

- Spatial: GIST index on `Block.geom` and `Vineyard.centroid`.
- Tenant-scoped composite indexes on `(org_id, created_at)` for high-volume tables (`Capture`, `MLPrediction`, `WeatherObservation`, `DataLakeEvent`).
- Unique constraints: `(org_id, kind)` on `IntegrationConnection`; `(category, ref_id)` on `ResearchDocument`.

### 9.4 Migration sequence

Per CODEBASE_PLAN section 8.3:

1. M0-02: auth tables (Org, User, Membership, Session, AuthEvent, ConsentRecord).
2. M0-03: spatial tables (Vineyard, Block).
3. M0-04: data-lake event schemas registered.
4. M0-06: WeatherStation, WeatherObservation.
5. M0-06b (SA-1): `ExternalRiskIndex`.
6. M1-07/08: RiskIndexRun.
7. M1-09: Capture.
8. M1-10: MLPrediction.
9. M1-11: MLCorrection.
10. M1-12: Recommendation, RecommendationOutcome.
11. M1-14: SprayRecord, Product, UserProductPreference, IntegrationConnection.
12. M1-15: ChatSession, ChatMessage.
13. M1-16: Notification, NotificationEvent.

### 9.5 Data lake (S3 + Apache Iceberg or Delta Lake)

Append-only, partitioned by `org_id / category / date`. Every event from section 19 captures lands here in Parquet with a strict schema. Section 19 details the schema-registry CI check.

---

## 10. ML / Computer Vision Pipeline

![ML Pipeline](diagrams/ml-pipeline.png)

### 10.1 Datasets

| Dataset | Size | License | Use |
|---|---|---|---|
| GLDD (Tang et al. 2020) | 4,449 grape leaf images, 6 classes | Research-permissive [Brain 01_visual-detection / P3] | Pre-training and validation |
| PlantVillage (subset, grape) | ~4,000 images | CC0 | Pre-training |
| User captures (with consent) | Growing | Per-user consent | Active-learning fine-tuning per region |
| Internal test set (Napa, Sonoma) | ~500 images, ground-truth labeled by domain experts | Internal | Holdout evaluation |
| Hyperspectral PM severity dataset (Knauer 2017) | Smaller, hyperspectral [Brain 01_visual-detection / P2] | Research | Severity calibration reference |

### 10.2 Labeling protocol

Severity scale: integer 1 to 10 mapped to EPPO Standard PP 1/004 reference photos [Brain 01_visual-detection / P1]. The mapping table is fixed at launch and revised only with formal review.

| EPPO PP 1/004 level | Approximate disease coverage | Graft Spray severity |
|---|---|---|
| 0 | 0% (healthy) | 0 (out-of-band; reported separately) |
| 1 | 1 to 5% | 1 to 2 |
| 2 | 6 to 15% | 3 to 4 |
| 3 | 16 to 30% | 5 to 6 |
| 4 | 31 to 50% | 7 to 8 |
| 5 | 51 to 100% | 9 to 10 |

Three labelers per image at launch; majority vote for the final label. Inter-rater reliability tracked; labelers below 80% agreement are flagged.

### 10.3 Augmentation strategy

Field photo realism:
- Variable lighting (CLAHE, gamma jitter).
- Angle and rotation (up to ±30°).
- Partial occlusion (cutout, mixup).
- Dust, water droplet, and smudge synthesis to mirror harvest-season conditions.
- Color jitter constrained to plausible foliage chromaticity.

### 10.4 Model architectures

**On-device (iOS).** MobileNetV3-Small or EfficientNet-Lite0. Target 5 to 10 MB exported (TFLite int8 or ONNX int8). Latency target: under 1 second p95 on iPhone 12 or newer.

**Cloud (web + iOS second-opinion).** ConvNeXt-Tiny or EfficientNetV2-S as the launch choice, with Vision Transformer (ViT-S/16) as an evaluation alternative. Target 50 to 200 MB. Latency target: under 4 seconds p95 on AWS g5.xlarge or similar GPU instance, under 8 seconds p95 on CPU fallback.

The cloud model also serves as the per-region active-learning teacher for the on-device student.

### 10.5 Training, validation, hold-out

Stratified by region and dataset. Splits: 70/15/15 train/val/test. The internal Napa/Sonoma test set is held out completely from training.

### 10.6 Evaluation metrics

- Per-class F1 across {healthy, powdery, downy, other}.
- MAE on severity 1 to 10 (continuous evaluation; predictions rounded to integer for reporting).
- Region-stratified evaluation: report metrics per region.
- Confusion matrix surfaced in the model card per release.

### 10.7 Versioning, rollout, active-learning loop

- Models versioned via MLflow or DVC. Every promoted model has a model card documenting datasets, augmentation, metrics, region coverage, and intended use.
- Rollout: canary in one region for 7 days, then global. Cloud and on-device promoted in lockstep.
- Active-learning loop: low-confidence captures (confidence below threshold per region) auto-queue for human re-labeling; corrections feed the next training cycle.

### 10.8 Output schema

Returned to clients on every prediction:

```json
{
  "prediction_id": "uuid",
  "capture_id": "uuid",
  "model": "convnext_tiny_v0.3",
  "powdery_prob": 0.84,
  "downy_prob": 0.08,
  "other_prob": 0.05,
  "healthy_prob": 0.03,
  "severity_1_to_10": 4,
  "confidence": 0.87,
  "latency_ms": 1240,
  "device": "cloud"
}
```

When the cloud model and on-device model disagree by more than the configured tolerance, both predictions are returned with `disagreement: true` and the cloud value supersedes.

---

<!-- END OF DRAFT. Sections 11 through 25 to be added in subsequent commits on graft-spray/m0/spec-pdf. -->
