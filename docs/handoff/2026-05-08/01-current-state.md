# Current State - 2026-05-08

## Live infrastructure

| Surface | Host | URL | Notes |
|---|---|---|---|
| Marketing site + Spray frontend | Vercel | https://graftsystems.com + /spray/* | Next.js 15 App Router; auto-deploys on push to `main` |
| Spray API | Render Web Service `GraftWebsite` | https://graftwebsite.onrender.com | Django 5.2 + DRF + PostGIS; auto-deploys on push to `graft-spray/main` |
| Worker | Render Background Worker `graft-spray-worker` | n/a | Celery 5 + Redis broker; runs beat + sensor pulls + aggregation engine |
| Redis (broker + result) | Render Key Value `graft-spray-redis` | internal | Valkey 8 |
| Postgres + PostGIS | Render Postgres `graft-db` | internal | Pro plan, PostgreSQL 18 + PostGIS extension |
| Object store | AWS S3 us-west-2 | `graft-spray-lake-dev`, `graft-spray-imagery-dev` | SSE-S3; lake gets Parquet event dumps; imagery gets capture uploads |

## M1.5 PR status

| PR | Status | What it ships |
|---|---|---|
| PR-A | merged | SA-2 pivot docs (decision-intelligence aggregation hub) |
| PR-B | merged | Aggregation event schemas (RiskRecord, BlockVerdict, AdvisoryEvent, SensorReading) |
| PR-C | merged | Aggregation engine MVP - 3 model runners (Gubler-Thomas, Caffi Primary, Caffi Secondary), equal-weight ensemble, audit hash, hourly beat |
| PR-D | merged | Pessl FieldClimate OAuth 2.0 connector + Fernet credential store + SensorConnector Protocol |
| PR-E | merged | Davis WeatherLink (paste-key + polling) + METER ZENTRA (paste-token + HTTPS Push webhook) |
| PR-F | merged | VerdictCard UI + deterministic daily brief |
| PR-F.5 | merged | LLM-authored brief (Claude Sonnet) + P-Cite verifier + tamper-evident PDF audit export |
| PR-29 hotfix | merged | `@transaction.atomic` added to 18 views that called `set_current_org_id` without a transaction - fixes a 404 on every PATCH/GET that uses RLS |
| PR-G | NOT STARTED | Sentinel-2 zonal stats via CDSE |
| PR-H | NOT STARTED | Advisory feeds (UC IPM, BSV, INRAE, INTA) |

## What's working live as of this snapshot

- Sign-up, sign-in, sign-out via Clerk
- Org creation + member invitations + role management (4-role RBAC: Owner / Admin / Member / Viewer)
- Vineyard + Block creation via map-draw UI
- Capture upload (photo only at MVP; ~25MB per file)
- Hourly weather pull (Visual Crossing) for regional-default WeatherStations in Napa / Sonoma / Burgundy / Bordeaux / Mendoza
- Hourly SA-1 external risk index pull (UC IPM Grape PM, uspest.org)
- Hourly aggregation engine - runs three model runners against weather window, fuses via equal-weight ensemble, emits BlockVerdict
- Daily brief endpoint (deterministic template) - `GET /api/spray/orgs/<org>/blocks/<block>/verdicts/<id>/brief`
- LLM-authored brief (Claude Sonnet) when `ANTHROPIC_API_KEY` is set on the API service - verified-prose path; deterministic fallback on any failure
- Audit PDF endpoint - `GET .../verdicts/<id>/audit.pdf`
- Pessl OAuth 2.0 connect flow (UI works, but no partner-app credentials yet - see deferred)
- Davis paste-key connect flow (UI + smoke validation work; user provides their own API-Key + API-Secret)
- METER paste-token + webhook receiver (UI works; HMAC-validated; constant-401 reject across all error paths)
- DataLakeEvent ingest → S3 Parquet every 15 min

## What's deferred / not yet wired

See [`04-roadmap-and-deferred.md`](./04-roadmap-and-deferred.md) for the full list. Key items:

- **Pessl partner-app credentials.** Benson has not yet emailed Pessl (api@metos.at + support@fieldclimate.com) to request OAuth client_id + client_secret. Until then, "Connect Pessl" 503s with a readable error. Davis + METER paths work independently.
- **Anthropic API key.** Benson added one to Render API env on 2026-05-08. LLM brief path is live; verify via the brief endpoint's `renderer` field returning `llm@claude-sonnet-4-5-20251022/daily_brief@1.0.0`.
- **Davis subscription tier risk.** Benson's test Davis account is on "Basic" - historical (`/v2/historic`) endpoint is gated to Pro/Pro+. Live polling works; 14-day backfill on connect probably 403s on Basic accounts. Pre-symptomatic warning for any real winery customer.
- **PR-G + PR-H** - satellite + advisory feeds, not started.
- **No regression test for the RLS-GUC + atomic bug** - recommended by Builder in the PR-29 review. Add in next sprint.
- **Caffi primary 2009 test bug** - `test_caffi_primary_no_rain_no_infection` asserts `conditions_met == 0` but the runner correctly returns 1 (mean_temp 14°C ≥ 11°C threshold). Pre-existing, side-task chip queued.

## What's broken / known issues right now

- None blocking. The RLS-GUC bug fixed in PR-29 was the last known blocker.
- The Caffi test failure flagged above is benign (test assertion is wrong, not the runner).
- `IntegrationStationListView.get` holds a Postgres connection during the vendor HTTP call inside its `@transaction.atomic` block (typically <30s). Documented in code; refactor candidate but not a correctness issue.

## How to verify the system is live (no-hardware smoke)

This is the demo path that doesn't need any sensor hardware - it works entirely on regional-default Visual Crossing weather data:

1. Sign in at https://graftsystems.com → `/spray`
2. Create a Vineyard in `napa` region
3. Draw a Block polygon on the satellite map (any shape over Napa)
4. Save the block (this now works post PR-29)
5. Wait up to 60 min for the next aggregation engine tick
6. `/spray/dashboard` should show a VerdictCard for the block
7. Click "audit pdf ↗" in the card footer → tamper-evident PDF
8. Hit the brief endpoint directly to confirm LLM prose: `curl -H "Authorization: Bearer <clerk-jwt>" https://graftwebsite.onrender.com/api/spray/orgs/<org>/blocks/<block>/verdicts/<verdict>/brief`
