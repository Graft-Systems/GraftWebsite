# Prompt 2 — Graft Spray Application Specification (for Perplexity Computer → handoff to Claude Code)

## Project
**Name:** Graft Spray

**Umbrella Project Goal:** Tell winegrowers when to spray their vineyards and when not to, to prevent the spread of powdery and downy mildew and save money compared to indiscriminate spraying.

## Your Job
Produce a **single comprehensive PDF** at `/graft-spray/spec/Graft-Spray-App-Spec.pdf` that fully specifies the Graft Spray application end-to-end so it can be implemented by Claude Code with no further design decisions required. Reference the research dossier at `/graft-spray/research/` throughout — every design decision should cite the relevant research source(s).

## Required PDF Sections (in order)
1. Executive Summary
2. Umbrella Project Goal (verbatim — see above)
3. User Personas & Jobs-to-Be-Done
4. Geographic & Language Rollout Plan
5. Platform Strategy (Web MVP → iOS via React Native + Expo, Android-ready)
6. Core User Flows (with wireframe diagrams)
7. Screen Inventory & Information Architecture
8. Feature Specification (one subsection per must-have)
9. Data Model & Schema
10. ML / Computer Vision Pipeline
11. Disease Forecasting Engine
12. Weather & External Data Integration Layer
13. Notification System
14. Tech Stack & Architecture
15. App Store Compliance Checklist (Apple)
16. Web MVP Compliance & Accessibility (WCAG 2.2 AA)
17. Security, Privacy & Liability
18. Analytics & Telemetry
19. **Data Capture & Learning Pipeline** (NEW — secure capture of all user-generated data for model training)
20. **Account & Identity System** (NEW — signup, login, logout, MFA, account lifecycle)
21. **Graft Website Integration** (NEW — "Spray" nav-bar entry, gated login handoff, distinct authenticated UI)
22. Testing Strategy
23. Roadmap & Milestones
24. Open Questions & Risks
25. Appendix: Glossary, References, Source Map to Research Dossier

## Fixed Decisions (do not re-debate)
- **Languages:** English at launch. Roadmap: French, then Spanish. Architect for i18n from day one (locale files, ICU message format, RTL-safe even if not needed yet).
- **Geographic rollout:** Napa & Sonoma → Burgundy → Bordeaux → Mendoza → global. Region-aware data sources gate features per region.
- **Platforms:** **Web MVP first**, then **iOS native**. Android is out of scope until further notice. Architect the backend to be platform-agnostic so iOS reuses the same APIs.
- **Target classes for ML:** **Powdery mildew** and **downy mildew** only at launch. **Severity scale 1–10** — map this to published scales (EPPO, Horsfall-Barratt) in the spec.
- **API budget:** Undetermined. For every external API, list pricing tiers and recommend a default tier, but design the abstraction so providers can be swapped.
- **App-store target:** Apple App Store (iOS).
- **Account system is mandatory.** Every user must create an account, log in to access any feature, and be able to log out. No anonymous use beyond a marketing landing page. Spec the full lifecycle: signup, email/phone verification, password reset, MFA option, session management, log out (current device + all devices), account deletion (Apple 5.1.1(v) compliant).
- **All user-generated data is captured, categorized, and persisted to a secure data lake** that feeds the learning system. Every user action and artifact (photo, video, polygon, spray record, recommendation accepted/rejected, chatbot interaction, weather observation pulled, sensor reading ingested, notification responded to) is logged with structured metadata for downstream model training. Storage must satisfy GDPR/CCPA legal bases, support per-user export and deletion, and remain encrypted at rest and in transit. See the new sections **§19 Data Capture & Learning Pipeline** and **§20 Account & Identity System** below.
- **Distribution is via the existing Graft Systems website.** The Graft Spray web app is **not a standalone domain** — it is a new "Spray" entry in the existing Graft website navigation bar (`https://github.com/Graft-Systems/GraftWebsite`). Clicking "Spray" prompts a login (or signup if new) and then opens a **distinct, fully authenticated UI experience** that is visually and functionally separate from the marketing site. See **§21 Graft Website Integration** below.

## Inference Strategy (clarifying for the user)
> *On-device inference* runs the ML model directly on the user's iPhone (via TensorFlow Lite or an ONNX Runtime build embedded in the React Native app). It is instant, works offline, and keeps photos private, but model size is limited.
> *Cloud inference* uploads the photo to our server, runs a larger model, and returns the result. Slower, needs signal, but more accurate and easier to update.

**Recommendation to specify in the PDF: hybrid.**
- Web MVP: cloud inference only (no on-device option in browsers practical for our model size).
- iOS (React Native): lightweight on-device model via `react-native-fast-tflite` or `onnxruntime-react-native` for instant first-pass result + cloud "second-opinion" model for final severity grading and edge cases. Cache last-known model weights in the app bundle / on-device storage so the app degrades gracefully offline. The same TFLite/ONNX artifact can later ship to Android with no model rework when we decide to expand.

## Tech Stack (specify in detail; rationale must be in the PDF)
- **Web frontend (MVP):** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui components, MapLibre GL or Mapbox GL JS for satellite mapping with polygon drawing.
- **iOS app (Phase 2): React Native (Expo).** TypeScript, Expo SDK (managed workflow with prebuild for native modules where required), React Navigation, NativeWind (Tailwind for RN) or Tamagui for shared design tokens with the web app. Map: `react-native-maps` (Apple Maps satellite layer) + a polygon-drawing layer; alternative `@rnmapbox/maps` if higher-fidelity satellite imagery is required. Camera/video: `expo-camera` and `expo-av`. On-device ML: `react-native-fast-tflite` (preferred) or `onnxruntime-react-native`. Local persistence: `expo-sqlite` + `expo-secure-store` (Keychain-backed) for tokens. Push: `expo-notifications` over APNs. The same RN codebase is later extended to Android by simply enabling the Android target — architect for it from day one even though Android is out of scope for launch.
- **Shared client code:** A `packages/client-core` workspace package containing TypeScript API client (generated from the OpenAPI spec), domain types, and React hooks reused by both Next.js (web) and React Native (iOS). No duplication between web and mobile.
- **Backend:** Django + Django REST Framework (Python) for primary API. Postgres + **PostGIS** for vineyard polygons and spatial queries. Celery + Redis for background jobs (weather pulls, risk-index recomputes, notification dispatch).
- **ML inference service:** Separate FastAPI service (Python) running on GPU instances, hosting the cloud-side classifier. Models versioned via MLflow or DVC. Training pipeline in PyTorch. Export to TFLite + ONNX for the React Native on-device model.
- **Object storage:** S3 (or Cloudflare R2) for user-uploaded photos/videos and model artifacts.
- **Auth:** Clerk or Auth0 (multi-tenant: vineyard org → users → roles). Use the official Clerk Expo SDK / Auth0 RN SDK in the mobile app; the same provider serves the web app for unified sessions. Sign in with Apple via `expo-apple-authentication`.
- **Push notifications:** APNs (iOS) via `expo-notifications`, web push (MVP).
- **Chatbot:** Gemini API (per the user's spec) wrapped behind an internal abstraction so we can swap models. RAG over the research dossier in `/graft-spray/research/` plus the user's own uploaded resources.
- **Hosting:** Vercel for Next.js frontend; AWS or GCP for Django + ML service; Cloudflare for CDN.
- **Mobile build & distribution:** EAS Build (Expo Application Services) for iOS builds; EAS Submit for App Store delivery; EAS Update for OTA JavaScript updates (with App Store Guideline 4.7 compliance — no behavior change, only bug fixes/content/styling).
- **Observability:** Sentry (with `@sentry/react-native` for the mobile app), OpenTelemetry, Datadog or Grafana Cloud.

## Feature Specification — Must-Haves (carry every one of these forward verbatim in intent)
For each feature below, the PDF must include: description, user story, acceptance criteria, screens involved, data dependencies, API contracts, edge cases, a research-dossier reference, **and a list of every event the feature emits into the data lake (per §19)**.

1. **Super easy to use.** Document concretely: core spray decision reachable in ≤ 2 taps from home; onboarding ≤ 5 minutes; outdoor-readability UI (high contrast, large tap targets, glove-friendly).
2. **Not complex.** Hide advanced settings behind progressive disclosure. Default everything sensibly per region.
3. **Must fulfill the requirements to be listed in the Apple App Store.** Full Apple compliance checklist: App Privacy, ATT, App Tracking, in-app purchases (if any), camera/location/notification permissions with usage strings, App Review Guideline 5.1 (privacy), 1.4 (safety / pesticide-advice disclaimer), 4.0 (design), 4.8 (Sign in with Apple), 5.1.1(v) (in-app account deletion).
4. **Integrate and use live and recently published documentation specific to the user's region** as part of the recommendation process. Spec the regional content service, pulling from the research dossier and live feeds, that scopes recommendations to the active vineyard's region.
5. **Allow the user to take pictures and videos of their grapes and leaves**, upload to the cloud, and **interpret the stage of mildew progression** — sporulation stage and severity 1–10 via deep learning trained on prior labeled examples. Spec capture flow, upload queueing, offline buffering, model output schema.
6. **Provide a place for the user to connect their own specific resources** (e.g., paid weather feeds, lab data) and **upload their personal spray history** and **preferred mildew control products**. Spec the integrations panel, CSV/PDF import for legacy spray logs, and a product catalog the user can prune.
7. **Provide targeted sporulation-reduction product suggestions and instructions** specific to each vineyard's needs. Recommendation engine respects user's preferred-products list, FRAC rotation rules, PHI/REI, and organic-only flags.
8. **Recommends when the vineyard should spray next** (spray schedule), **what order to spray which products**, **the different vineyard regions**, and **what climate factors contribute to these suggestions**. Output is a per-block schedule with explanations of the underlying weather and risk-index drivers.
9. **Provide a severity assessment** showing which areas of the vineyard are at highest risk for sporulation and what weather conditions to watch. Heatmap overlay on the satellite map; per-block risk gauge; "what to watch" weather widget.
10. **Notify the vineyard manager when their area comes under moderate and high risk** of powdery mildew spread. Permission flow asks before enabling. Configurable thresholds, quiet hours, and per-block subscriptions.
11. **Integrate a pre-trained AI model like Gemini acting as a chatbot** to help vineyard managers answer questions and navigate the app. RAG-grounded over the research dossier and the user's own data; safety guardrails for pesticide-recommendation queries.
12. **Integrate a highly detailed satellite map** that lets managers draw vineyard outlines, **save drawn maps via GPS as distinct vineyards and blocks**, and **label** them. Each plot is a distinct entity with its own spray timeline. Spec polygon drawing, snapping, GeoJSON storage in PostGIS, and per-block recommendation generation.
13. **The goal is to save the vineyard manager money so they only spray when they need to.** Add a "savings tracker" surface comparing recommended sprays vs. a calendar-spray baseline (cost, fungicide volume, FRAC group diversification).

## Data Model (must include)
Entities at minimum: `Org`, `User`, `Membership/Role`, `Session`, `AuthEvent`, `ConsentRecord`, `Vineyard`, `Block` (PostGIS polygon), `WeatherStation`, `WeatherObservation`, `RiskIndexRun`, `SprayRecord`, `Product` (with FRAC group, PHI, REI, organic flag), `UserProductPreference`, `Capture` (photo/video upload), `MLPrediction` (disease, severity 1–10, confidence), `MLCorrection` (user-provided ground truth), `Recommendation`, `RecommendationOutcome`, `Notification`, `NotificationEvent` (sent/opened/acted), `IntegrationConnection`, `ResearchDocument` (the brain), `ChatSession`, `ChatMessage`, `DataLakeEvent` (envelope for §19 capture). Provide ER diagram + key indexes (especially spatial indexes on `Block.geom` and tenant-scoped indexes by `org_id`).

## ML / Computer Vision Pipeline (must include)
- Data sources: list every dataset from research dossier §1 with size and license.
- Labeling protocol for severity 1–10 (must reconcile differences across source datasets).
- Augmentation strategy (field photo realism: lighting, angle, partial occlusion).
- Model architecture options: a lightweight backbone (MobileNetV3 / EfficientNet-Lite) for on-device + a larger backbone (ConvNeXt / EfficientNetV2 / ViT) for cloud.
- Training, validation, hold-out splits stratified by region and dataset.
- Eval metrics: per-class F1 for {healthy, powdery, downy}, MAE on severity 1–10, region-stratified.
- Versioning, rollout, and active-learning loop (low-confidence captures escalate to cloud + queue for human re-labeling).
- Output schema returned to clients.

## Disease Forecasting Engine (must include)
- Implement Gubler-Thomas (with revised high-T thresholds), DMCast (or equivalent), and Mills-Table-based leaf wetness infection events.
- Inputs sourced from the Weather & External Data Integration Layer.
- Per-block daily index recompute via Celery beat.
- Document fallback behavior when leaf-wetness sensors are unavailable (estimate from RH + temperature per published proxies).

## Weather & External Data Integration Layer (must include)
- Provider abstraction; one adapter per source from research dossier §3.
- Region-aware default provider selection.
- User-supplied integrations slot in via the same interface.
- Rate-limit handling, caching, and historical backfill.

## Notification System
- Channels: APNs (iOS), web push, email fallback.
- Permission flow per Apple guidelines.
- Per-block thresholds, quiet hours, digest mode.
- Test harness for simulating high-risk events.

## Data Capture & Learning Pipeline (§19 — must include)
The app must treat **every user-generated artifact as training fuel** for the Graft Spray learning system, while keeping it secure and legally compliant.

### Capture Inventory (every event/artifact below must be persisted with structured metadata)
| Category | Examples | Why It Feeds the Brain |
|---|---|---|
| **Imagery** | Leaf/cluster photos and videos uploaded from web or iOS | Expands the labeled image corpus; powers active-learning re-training of the ML classifier |
| **ML predictions & corrections** | Model output (powdery prob, downy prob, severity 1–10, confidence) + user agreement/correction | Hard-positive/hard-negative mining for next model version |
| **Vineyard geometry** | Block polygons, labels, planted varieties, training systems, row spacing | Improves geo-stratified models and per-region calibration |
| **Weather pulls** | Every weather observation and forecast pulled per block per provider | Builds proprietary historical weather corpus tied to disease outcomes |
| **Sensor readings** | User-connected sensor streams (Davis, METER, Sencrop, Pessl, etc.) | Calibrates leaf-wetness proxies, fuses on-farm with regional data |
| **Spray records** | Date, product, rate, equipment, conditions, applicator, target disease | Closes the loop: did the spray work? Drives recommendation tuning |
| **Recommendations & outcomes** | Every recommendation served + whether the user followed it + downstream disease observation | Reinforcement signal for the recommendation engine |
| **Risk-index runs** | Every Gubler-Thomas / DMCast / Caffi computation per block per day | Backtesting and model-comparison data |
| **Chatbot interactions** | Prompts, responses, thumbs up/down, citations clicked | RAG quality improvement and intent-router training |
| **Notifications** | Sent + opened + acted on | Notification timing and threshold optimization |
| **User integrations** | Connections to third-party data sources, uploaded legacy spray history (CSV/PDF) | Enriches per-user context |
| **App telemetry** | Screen views, taps, time-to-decision, errors | UX optimization (separate from training data per privacy) |

### Storage Architecture
- **Operational store (Postgres + PostGIS):** transactional state — current vineyard, current recommendation, current account.
- **Object storage (S3 / Cloudflare R2):** raw imagery, video, uploaded documents. Encrypted at rest (SSE-KMS), private bucket, signed URLs only.
- **Data lake (S3 + Apache Iceberg or Delta Lake):** append-only, partitioned by `org_id / category / date`. Every captured event lands here in Parquet with a strict schema.
- **Feature store (Feast or equivalent):** derived features for ML training and online inference.
- **Schema registry:** every event type has a versioned schema; breaking changes require migration plan.
- **Audit log:** immutable record of every read/write touching user data, retained ≥ 2 years.

### Pipeline
- All capture events flow through a single ingest service (e.g., FastAPI endpoint or Kafka topic) → validated against schema registry → written to operational store + lake.
- Nightly batch jobs (Celery/Airflow) move warm data into curated training datasets, stratified by region and labeled with provenance (`source_user_id`, `source_org_id`, `capture_timestamp`, `device`, `app_version`, `consent_flags`).
- Active-learning loop: low-confidence ML predictions automatically queue for human re-labeling; corrections feed back into the next training cycle.

### Security & Privacy Controls (non-negotiable)
- **Encryption:** TLS 1.3 in transit; AES-256 at rest; KMS-managed keys with rotation.
- **Tenant isolation:** every row in operational store and every object in storage tagged with `org_id`. Row-level security in Postgres; bucket prefix isolation in S3; query-time enforcement in the lake.
- **Access control:** RBAC (Owner, Admin, Member, Viewer) at org level; principle of least privilege for internal staff; break-glass access requires ticket + audit log entry.
- **PII minimization:** name, email, phone segregated from training data; training pipelines see only pseudonymous IDs.
- **Consent management:** every user sees, at signup and any time after, exactly what is captured and how it is used. Granular toggles per category (e.g., "use my photos for model training" can be off while the app still works).
- **Legal bases:** GDPR (EU phase) Art. 6(1)(b) for service delivery + Art. 6(1)(a) consent for ML training; CCPA opt-out for sale/share (none, but document); explicit opt-in required for any third-party sharing.
- **Per-user data subject rights:** in-app export (JSON + photo zip) within 30 days; in-app account deletion that purges operational data immediately and lake data within 30 days (or anonymizes irreversibly if used in trained models — document the trade-off).
- **Retention:** raw imagery retained indefinitely if user consented to training use; 90-day default if not. Spray records retained per regional compliance (CA 2-year minimum, EU 5-year, France 5-year).
- **Data residency:** EU users' personal data stored in EU region (Frankfurt or Ireland) by Burgundy phase; US users in us-west; Argentine users in São Paulo or us-east depending on availability. Lake training data is pseudonymized so it can be globally co-located.
- **Penetration testing:** annual third-party pen test before each milestone launch; vulnerability disclosure program documented.
- **Compliance frameworks:** SOC 2 Type II target by M3 (Burgundy phase), GDPR by M3, CCPA by M1.

### Acceptance Criteria
- Every must-have feature in §8 emits at least one event into the data lake with a documented schema.
- A user can export all their data via the in-app data-export flow.
- A user can delete their account and verify (via support contact) that data was removed within 30 days.
- Internal staff cannot read user imagery without an audited, time-limited grant.
- Schema-registry CI check blocks any PR that introduces an unregistered event type.

## Graft Website Integration (§21 — must include)

Graft Spray is **delivered through the existing Graft Systems marketing website**, not as a standalone domain. The PDF must specify the integration in full.

### Existing Site
- Repo: `https://github.com/Graft-Systems/GraftWebsite`.
- Inspect the existing navigation, theme tokens, and routing conventions before designing the Spray surface; replicate the look-and-feel for the marketing entry point so the user feels they are still inside Graft.

### Navigation Integration
- Add a new top-level link **"Spray"** to the existing Graft website navigation bar.
- Position: per the existing nav order — propose two options in the PDF (e.g., as the rightmost item before "Contact", or grouped with product offerings) and recommend one.
- Behavior:
  - **Unauthenticated visitor:** clicking "Spray" routes to a short marketing landing page (`/spray`) that explains Graft Spray and presents a primary **"Log in or Sign up"** CTA.
  - **Authenticated user:** clicking "Spray" routes directly to the authenticated app shell (`/spray/app` or subdomain — see Routing Options).
  - The nav state must reflect auth: when logged in, show the user's avatar/menu next to the Spray link; when logged out, show standard marketing nav.

### Routing Options (the PDF must pick one and justify)
1. **Subpath — `graftsystems.com/spray/*`** (recommended).
   - Pros: single domain, simpler SEO, shared cookies for SSO, no CORS pain.
   - Cons: tightly couples deploys; web-app build artifacts ship inside the marketing site repo or are reverse-proxied at the edge.
   - Implementation: Next.js App Router with route groups: `(marketing)` for the existing site, `(spray)` for the authenticated experience. Or, deploy the Spray app separately and reverse-proxy `/spray/*` from the marketing site (Vercel rewrites or Cloudflare Workers).
2. **Subdomain — `spray.graftsystems.com`.**
   - Pros: clean separation, independent deploy cadence.
   - Cons: cookie sharing for SSO requires `.graftsystems.com` parent-domain cookies; CORS configuration; users perceive it as a separate property.
   - Implementation: marketing site links out; auth provider configured for parent-domain SSO.
3. **Hybrid:** `/spray` marketing landing on the main site; `app.graftsystems.com` (or `spray.graftsystems.com`) for the authenticated app.
   - Recommended fallback if option 1 introduces deploy friction.

### Login / Signup Handoff
- Clicking the primary CTA on `/spray` opens the auth flow defined in §20 (Clerk or Auth0). Use a hosted or embedded auth UI consistent with Graft branding.
- Single sign-on across the marketing site and the authenticated app: a logged-in session persists when the user navigates back to marketing pages, so the "Spray" nav entry deep-links straight into the app on subsequent clicks.
- After login, route to a post-login destination based on org state:
  - Brand-new user with no org → onboarding wizard (`/spray/onboarding`).
  - Existing user with an org → dashboard (`/spray/dashboard`).
- After signup, run the consent + org-creation flow from §20.
- Logout returns the user to the marketing `/spray` landing page (not the homepage), so the next click resumes naturally.

### Distinct Authenticated UI Experience
The authenticated app must look and behave like a **dedicated product**, not like a logged-in version of the marketing site.
- **Separate layout shell** — the marketing top nav and footer are replaced by the app shell: persistent left sidebar (Vineyards, Map, Captures, Recommendations, Spray Log, Integrations, Chatbot, Settings), top bar with org switcher + notifications + user menu.
- **Distinct visual treatment** — same brand palette and typography (so the user feels they're still in Graft) but a denser, utility-first information architecture appropriate for a working tool. Define the differences explicitly in the PDF (spacing scale, density, component variants).
- **Separate code surface** — the app lives under `apps/web` route group `(spray)` (or in a separate Next.js project if subdomain routing is chosen). The marketing site's existing pages remain untouched.
- **No marketing chrome inside the app** — no "Subscribe to our newsletter" banners, no marketing footer, no analytics-pixel pop-ups; this is a working tool.
- **Consistent return path** — a small "Back to Graft Systems" link in the user menu returns to the marketing homepage in a new tab, so the user never feels trapped.

### Shared vs. Separate Concerns
| Concern | Shared with marketing site | Separate to Spray |
|---|---|---|
| Domain / TLS cert | ✅ | ❌ (subpath) / ✅ (subdomain) |
| Brand tokens (colors, fonts, logo) | ✅ | ❌ |
| Top navigation | ✅ (marketing only) | ✅ (app shell) |
| Auth provider & session | ✅ (SSO) | ❌ |
| Footer | ✅ (marketing only) | ❌ (app has none) |
| Page layout / IA | ❌ | ✅ |
| Analytics scope | Separate properties or tagged events | Separate |
| Deploy cadence | Independent | Independent |

### Implementation Plan (drop into Claude Code task list)
1. Add a `(spray)` route group to the Graft website Next.js app, or scaffold the new app under `apps/web` and reverse-proxy `/spray/*` from the marketing site.
2. Add the **"Spray"** link to the existing nav component; gate the destination on auth state (use the auth provider's hook).
3. Build the `/spray` marketing landing page (one screen) with hero, three-bullet value prop, and a primary CTA.
4. Wire the CTA into the auth provider's hosted/embedded login.
5. Implement the post-login router (onboarding vs. dashboard).
6. Build the authenticated app shell (sidebar + top bar) and place all §8 must-have features inside it.
7. Implement a shared brand-tokens package consumed by both the marketing site and the Spray app.
8. SEO: add `/spray` to the sitemap; mark `/spray/app/*` `noindex`.
9. Update the website README and deploy docs to reflect the new surface.

### Acceptance Criteria
- The existing Graft website continues to work unchanged outside the Spray surface (no regressions in the marketing pages).
- An unauthenticated user clicking "Spray" sees the marketing landing and a clear log-in/sign-up CTA.
- An authenticated user clicking "Spray" reaches the dashboard in one click (no extra login prompt).
- The authenticated UI uses the dedicated app shell, not the marketing layout.
- Logging out returns to `/spray` landing (or a configured destination), preserving the integration.
- SSO: signing in inside Spray also reflects on the marketing site nav (avatar/menu visible).
- Lighthouse scores for the marketing pages are unaffected by the Spray bundle (separate code-split).

## Account & Identity System (§20 — must include)

### Lifecycle
1. **Sign up** (email + password, or Sign in with Apple, or Google OAuth).
2. **Verify** email (and phone if used for SMS notifications).
3. **Onboard** — accept terms + privacy policy + per-category consent toggles.
4. **Create or join an Org** — vineyards are multi-user; first user becomes Owner.
5. **Log in** — session token (JWT or opaque) stored securely (Keychain on iOS, httpOnly Secure SameSite cookie on web).
6. **Stay signed in** with refresh tokens; idle and absolute session timeouts (configurable, defaults: 12 h idle, 30 d absolute).
7. **Log out** — current device or all devices (revokes all refresh tokens).
8. **Reset password** via emailed signed link (≤ 30 min expiry).
9. **Change password** in-app (requires current password).
10. **Enable MFA** — TOTP (Google Authenticator) or passkey/WebAuthn. Required for Owner role; optional for others.
11. **Account deletion** — in-app, two-step confirmation, fulfils Apple Guideline 5.1.1(v); triggers data lake purge per §19.

### Roles & Permissions
- **Owner** — full org control, billing, user invites, deletion. MFA required.
- **Admin** — manage blocks, integrations, recommendations.
- **Member** — capture photos, log sprays, view recommendations.
- **Viewer** — read-only (consultants, advisors).

### Tech Choices
- **Provider:** Clerk or Auth0 (recommend Clerk for faster setup and better DX). Justify in PDF.
- **Multi-tenant:** Org → Memberships → Users with role enforcement at API and DB layer.
- **Sessions:** short-lived access tokens (15 min) + long-lived refresh tokens (30 d), both rotated on use.
- **Brute-force protection:** rate-limit login (5/min per IP, 10/min per account); progressive delays; CAPTCHA after 5 failures.
- **Anomaly detection:** new-device email alerts; impossible-travel detection.
- **Audit log:** every auth event (login, logout, password change, role change, MFA enable/disable) recorded immutably.

### Compliance Requirements
- Apple Sign in with Apple offered alongside any third-party SSO (Apple Guideline 4.8).
- Account deletion in-app (5.1.1(v)).
- Privacy nutrition label declares Account, Contact Info, Identifiers, User Content, Usage Data.
- GDPR-compliant consent flow at signup (granular toggles, no pre-ticked boxes, plain language).
- COPPA: no users under 13 (terms enforcement).

### Acceptance Criteria
- A new user can complete signup → email verify → org creation in under 3 minutes.
- Logging out from one device does not log out other devices unless "log out everywhere" is selected.
- A forgotten-password flow works end-to-end with no support contact required.
- Owner role cannot be left vacant — deleting the last owner forces transfer or org deletion.
- All auth events appear in the audit log with timestamp, IP, user agent, outcome.

## App Store Compliance Checklist (Apple)
Walk through every relevant App Review Guideline with a pass/action item, including:
- Camera, Location (When-In-Use + Always justification), Notifications, Photo Library — Info.plist usage strings.
- Pesticide-recommendation disclaimer + "consult local extension" language to satisfy Guideline 1.4.1.
- Account deletion in-app (Guideline 5.1.1(v)).
- Sign in with Apple if any third-party SSO is offered (4.8).
- Data collection disclosure for App Privacy "nutrition label."

## Web MVP Compliance
WCAG 2.2 AA, GDPR (for Burgundy/Bordeaux phase) and CCPA (Napa/Sonoma phase). Cookie banner for EU. Data residency considerations.

## Security, Privacy & Liability
- Photos and vineyard polygons treated as confidential business data.
- Encryption at rest and in transit; signed upload URLs.
- Liability disclaimer language for spray recommendations; document review requirements.
- FRAC rotation enforcement to mitigate resistance-related claims.

## Roadmap & Milestones (target structure)
- **M0 — Foundations:** repo bootstrap, **account & identity system (signup, login, logout, MFA, account deletion)**, **data-lake ingest service with schema registry**, schema, satellite map polygon drawing, weather-feed adapters for Napa/Sonoma.
- **M1 — Web MVP:** capture upload (web), cloud inference, Gubler-Thomas + DMCast risk indices, recommendation engine v1, savings tracker, **per-user data export and account deletion**, English only.
- **M2 — iOS launch (React Native + Expo):** ship the React Native app to the App Store via EAS Build/Submit. Includes on-device first-pass model (TFLite/ONNX), `expo-notifications` push, `expo-apple-authentication` for Sign in with Apple, `react-native-maps`/`@rnmapbox/maps` polygon drawing, `expo-camera` capture flow, offline buffering via `expo-sqlite`, and shared `packages/client-core` integration.
- **M3 — Burgundy + French i18n + GDPR readiness + EU data residency.**
- **M4 — Bordeaux.**
- **M5 — Mendoza + Spanish i18n.**
- **M6+ — Global expansion.**
Each milestone gets entry/exit criteria, owner suggestions, and a Claude Code task list (see next section).

---

## Claude Code Section (substantially expanded)

This section appears as **Appendix C** of the PDF and is also exported as a standalone markdown file at `/graft-spray/spec/CLAUDE_CODE_PLAN.md` so it can be checked into the repo.

### Repository
- Existing: `https://github.com/Graft-Systems/GraftWebsite`.
- All Graft Spray work goes on a new branch: **`graft-spray/main`**, with feature branches off it named `graft-spray/<milestone>/<feature>` (e.g., `graft-spray/m0/postgis-schema`).
- PRs target `graft-spray/main`. `graft-spray/main` merges to `main` only at milestone boundaries.

### Repo Layout (monorepo, pnpm workspaces + Turborepo)
```
/apps
  /web                ← Next.js (TypeScript)
  /mobile             ← React Native + Expo (TypeScript) — added in M2, iOS-first, Android-ready
/services
  /api                ← Django + DRF
  /ml                 ← FastAPI inference service (Python)
  /worker             ← Celery workers
/packages
  /client-core        ← OpenAPI-generated TS API client, domain types, shared React hooks (used by web + mobile)
  /ui                 ← shared design tokens, Tamagui or NativeWind config, primitive components
  /eslint-config      ← shared lint config
  /tsconfig           ← shared TS configs
/infra
  /terraform          ← infra as code
  /docker             ← compose for local dev
  /eas                ← EAS Build/Submit/Update profiles for the mobile app
/docs
  /spec               ← this PDF + CLAUDE_CODE_PLAN.md
  /research           ← symlink or git submodule of the research dossier
```

### Coding Standards
- Python: Black, Ruff, mypy strict, pytest, coverage ≥ 80% on services.
- TypeScript (web + React Native): ESLint, Prettier, strict mode, Vitest for unit tests, Playwright for web E2E, **Maestro** or **Detox** for React Native E2E, Storybook + RN Storybook for component snapshots.
- React Native specifics: no native modules outside Expo's curated list without explicit justification (keeps EAS Build simple); all platform-specific code in `.ios.ts`/`.android.ts` files; New Architecture (Fabric + TurboModules) enabled from day one.
- Conventional Commits. Squash-merge PRs.
- Every PR: tests, linter, type-check, and a short "Spec section reference" line linking the PDF section it implements.

### Claude Code Operating Rules
- **Always pull the latest spec from `/docs/spec/Graft-Spray-App-Spec.pdf` before planning a task.**
- For any task: (1) post a written plan as a PR draft description; (2) wait for human approval; (3) implement; (4) run tests; (5) self-review against acceptance criteria from the spec.
- Never invent a feature not in the spec. If the spec is ambiguous, open an issue tagged `spec-gap` instead of guessing.
- Every implemented feature must update `CHANGELOG.md` and the relevant section's acceptance-criteria checkboxes in `CLAUDE_CODE_PLAN.md`.

### MANDATORY — Whole-Codebase Plan (must be the FIRST artifact Claude Code produces)
Before writing a single line of feature code, Claude Code MUST clone the existing branch and produce a comprehensive, written plan covering the **entire** codebase as it will exist at M1 launch. This plan is a hard prerequisite for any implementation work.

**Source of truth to inspect:** the `graft-spray/main` branch of `https://github.com/Graft-Systems/GraftWebsite` (and the existing `main` branch where the marketing site lives). Read every existing file before planning; do not assume.

**Deliverable:** `docs/spec/CODEBASE_PLAN.md`, committed to `graft-spray/main` in a single PR titled "M0-00: Whole-Codebase Plan". Must include:

1. **Repository inventory** — every file currently in the marketing site, classified as: Keep (untouched), Modify (list the change), Move (to where), Delete (with reason). Nothing in the existing marketing site may be silently rewritten.
2. **Target tree** — the full directory structure at end of M1 (every folder and key file), matching the Repo Layout in this spec. Annotate every node with: owner workspace, language, what lives there, and which spec section it implements.
3. **Per-file responsibility map** — for every planned file, a one-line description of its responsibility. For shared modules (`packages/client-core`, `packages/ui`), list the public exports.
4. **Per-package dependency graph** — a Mermaid graph showing how `apps/web`, `apps/mobile`, `services/api`, `services/ml`, `services/worker`, `packages/*` depend on each other. No cycles allowed.
5. **Module-by-module milestone allocation** — every directory in the target tree mapped to the milestone (M0 / M1 / M2…) it lands in.
6. **Branch and PR plan** — the ordered list of branches Claude Code will open against `graft-spray/main`, mapped one-to-one to the Initial Task List below, with estimated diff size, dependencies between branches, and merge order.
7. **Migration plan for the existing marketing site** — explicit step-by-step on how the existing `GraftWebsite` repo is restructured into the new monorepo (pnpm workspaces + Turborepo) without breaking deploys. Must include a rollback plan.
8. **Database & data-lake schema plan** — every table from §Data Model with column-level definitions; every event type for §19 with its JSON schema; sequence in which migrations run.
9. **API surface plan** — the full OpenAPI spec outline for the Django API at M1, listed by route group (auth, vineyards, blocks, captures, predictions, recommendations, weather, sprays, integrations, notifications, chat, exports, admin). For each route: method, path, auth requirements, request/response shape, rate limit, emitted lake events.
10. **Environment & secrets plan** — every env var the system needs (`API_URL`, `CLERK_*`, `DATABASE_URL`, `S3_BUCKET`, `KMS_KEY_ID`, weather provider keys, Gemini key, Sentry DSN, EAS keys, etc.), where it lives (Vercel project / EAS secrets / AWS SSM), and rotation policy.
11. **CI/CD plan** — GitHub Actions workflows (lint, test, type-check, build, deploy preview, deploy prod), branch protection rules on `graft-spray/main` and `main`, required checks before merge, and EAS Build/Submit/Update pipelines for the mobile app.
12. **Testing-strategy mapping** — every spec section in §8 mapped to specific unit/integration/E2E tests (Vitest, Playwright, Maestro/Detox, pytest), with target coverage thresholds.
13. **Risk register** — explicit list of risks Claude Code identified while reading the existing code (e.g., framework version mismatches, missing TypeScript config, breaking changes from current site), each with a mitigation.
14. **Open questions for the human** — anything ambiguous in the spec or in the existing code is captured here as a numbered question. The plan PR cannot be merged until each question has an answer recorded inline.

**Approval gate:** the plan PR must be reviewed and approved by the human (Benson) before ANY task in the Initial Task List is started. The first commit on every subsequent feature branch must reference the section of `CODEBASE_PLAN.md` it implements.

**Living document:** `CODEBASE_PLAN.md` is updated at every milestone closeout to reflect what was actually built. Diff between planned and actual is summarized in the milestone closeout issue.

### Initial Task List for Claude Code (M0 + M1 ordered)
Each task includes: branch name, scope, acceptance criteria, test requirements, the spec section it implements, and (where relevant) the data-lake events it emits.

0. **`graft-spray/m0/codebase-plan`** — **MANDATORY FIRST PR.** Produce `docs/spec/CODEBASE_PLAN.md` covering the entire codebase per the "Whole-Codebase Plan" section above. Read every existing file in the `Graft-Systems/GraftWebsite` repo first. No other branch may merge until this is approved.
1. **`graft-spray/m0/repo-bootstrap`** — Monorepo scaffold (extend existing `Graft-Systems/GraftWebsite` repo with pnpm workspaces + Turborepo; do not create a separate repo), CI pipeline (GitHub Actions: lint, test, type-check, build), pre-commit hooks, devcontainer.
2. **`graft-spray/m0/auth-identity`** — Clerk integration covering BOTH the marketing site nav state AND the Spray app (single SSO across `graftsystems.com` and `/spray`). Org/User/Membership/Role/Session/AuthEvent/ConsentRecord models, signup, email verify, login, logout (current + all devices), password reset, MFA (TOTP + passkey), Sign in with Apple, in-app account deletion (Apple 5.1.1(v)), brute-force protection, full audit log.
2a. **`graft-spray/m0/website-integration`** — Add "Spray" link to the existing Graft website navigation; build the `/spray` marketing landing page; implement auth-aware routing (logged-in click goes to `/spray/app`, logged-out click goes to landing CTA); set up the `(spray)` route group / app shell; ensure marketing pages are unchanged; SSO across surfaces; sitemap and `noindex` updates.
3. **`graft-spray/m0/postgis-schema`** — Postgres + PostGIS, all entities from §Data Model, row-level security by `org_id`, migrations, seed scripts.
4. **`graft-spray/m0/data-lake-ingest`** — Single ingest service (FastAPI endpoint or Kafka topic), schema registry, S3 + Iceberg/Delta Lake setup, Parquet writers partitioned by `org_id/category/date`, audit log table, encryption at rest with KMS, signed-URL gateway for object storage. CI check that blocks unregistered event types.
5. **`graft-spray/m0/maps-polygon-draw`** — Next.js page with MapLibre satellite layer + polygon drawing, save to PostGIS as `Block`, label and list blocks. Emits `block.created`, `block.updated`, `block.deleted` events.
6. **`graft-spray/m0/weather-adapter-napa`** — Provider abstraction + first adapter (recommended: Visual Crossing or Tomorrow.io) covering Napa/Sonoma, including leaf-wetness estimation fallback. Emits `weather.observation.pulled` events.
7. **`graft-spray/m1/risk-engine-gubler-thomas`** — Implement Gubler-Thomas with revised high-T thresholds, daily Celery task, persisted `RiskIndexRun` per `Block`. Emits `risk_index.computed` events.
8. **`graft-spray/m1/risk-engine-dmcast`** — DMCast (or chosen downy model) with documented references. Emits `risk_index.computed` events.
9. **`graft-spray/m1/capture-upload-web`** — Authenticated photo/video upload from Next.js, signed S3 URLs, Capture record creation, basic gallery, **consent flag enforcement before any capture is admitted to the training lake**. Emits `capture.uploaded` events.
10. **`graft-spray/m1/ml-inference-cloud`** — FastAPI service hosting the cloud classifier, returns `{powdery_prob, downy_prob, severity_1_to_10, confidence}`. Model checkpoint versioning. Emits `ml.prediction.created` events; persists to lake with provenance metadata.
11. **`graft-spray/m1/ml-correction-loop`** — UI for users to confirm/correct ML predictions; persists `MLCorrection` records; queues low-confidence captures for human re-labeling. Emits `ml.correction.created` events.
12. **`graft-spray/m1/recommendation-engine-v1`** — Combine risk indices + ML predictions + user product preferences + FRAC rotation + PHI/REI to produce per-block spray recommendations with explanation strings. Emits `recommendation.served` and `recommendation.acted_on` events.
13. **`graft-spray/m1/savings-tracker`** — Compare recommended sprays vs. calendar-spray baseline; surface in dashboard.
14. **`graft-spray/m1/integrations-panel`** — UI + backend to let users connect their own weather feeds, upload spray history (CSV/PDF), and curate preferred-product list. Emits `integration.connected`, `spray_history.imported` events.
15. **`graft-spray/m1/chatbot-rag`** — Gemini-backed chatbot wrapper with RAG over `/docs/research/` + user's data, with pesticide-advice safety guardrail and disclaimer. Emits `chat.message.exchanged` events with thumbs-up/down feedback capture.
16. **`graft-spray/m1/notifications-web-push`** — Permission flow, threshold config, web push delivery, test harness. Emits `notification.sent`, `notification.opened`, `notification.acted_on` events.
17. **`graft-spray/m1/data-export-and-deletion`** — In-app per-user data export (JSON + photo zip) and full account deletion that purges operational data immediately and queues lake-data purge within 30 days. Required for GDPR/CCPA and Apple 5.1.1(v).
18. **`graft-spray/m1/i18n-foundation`** — ICU message setup, English baseline, locale-switcher plumbing ready for French.
19. **`graft-spray/m1/observability`** — Sentry + OpenTelemetry + audit logs.
20. **`graft-spray/m1/security-hardening`** — Rate limiting, CSP, dependency scanning, secrets management, signed URLs everywhere, tenant-isolation tests.
21. **`graft-spray/m1/qa-and-launch-checklist`** — Accessibility audit, perf budget, security scan, web MVP launch.

(Subsequent milestones M2–M6 task lists follow the same template — generate them in the PDF.)

### Definition of Done (per milestone)
- All tasks merged to `graft-spray/main`.
- All acceptance criteria checked.
- `docs/spec/CODEBASE_PLAN.md` updated to reflect what shipped vs. what was planned (diff summarized in the closeout issue).
- Spec PDF updated (section "Implementation Status").
- Demo recording attached to milestone closeout issue.
- Stakeholder sign-off comment on closeout issue.

---

## Operational Instructions for Generating the PDF
- Use the `office/pdf` skill.
- **Inspect the existing `Graft-Systems/GraftWebsite` repo before writing §21** so the integration plan reflects the actual nav, framework, and theme tokens already in use.
- Include diagrams: ER diagram, system architecture, ML pipeline, user flows, **and a website-integration diagram showing the `/spray` entry, login handoff, and authenticated app-shell boundary**. Mermaid → rendered images is acceptable.
- Header on every page: "Graft Spray — Application Specification". Footer with version + date.
- Cover page with project name, umbrella goal verbatim, and version 1.0.
- Total length expectation: 60–100 pages including diagrams and appendices.
- Every claim that came from the research dossier must cite it as `[Brain §X / source #Y]`.
- After generation, review every page for layout issues (text wrap, overflow, cut-off headers, low-contrast text) before sharing.
- Output: `/graft-spray/spec/Graft-Spray-App-Spec.pdf` plus `/graft-spray/spec/CLAUDE_CODE_PLAN.md`.
- Treat every word of "Umbrella Project Goal" as fixed — do not paraphrase it anywhere.
