# Graft Spray — pilot QA runbook

Use this checklist before a demo or pilot cut. Assumes **Clerk** auth, **Postgres + PostGIS**, and API + web running per repo README / `make setup-api`.

## Environment sanity

- [ ] `NEXT_PUBLIC_CLERK_*` and backend Clerk verify keys match the same Clerk instance.
- [ ] `DATABASE_URL` (API) points at PostGIS; `pytest services/api/spray/tests/` passes locally.
- [ ] `NEXT_PUBLIC_BACKEND_URL` or rewrites reach the Spray API (`/api/spray/*`).

## Seed / demo

- [ ] Run `python manage.py seed_spray_demo` (or project-documented equivalent) so an org, blocks, verdict, and sample captures exist.
- [ ] Sign in as a user with membership on that org; confirm dashboard loads without 401/403.

## Dashboard

- [ ] Setup checklist and metrics render; **Recompute** does not hard-error (may 429 if throttled—note if so).
- [ ] **Recent captures** strip shows up to N items with working thumbnail/link when URLs exist.
- [ ] **FRAC / program** card reflects org program settings (or empty state + link to Settings).
- [ ] **Pilot savings** card shows placeholder copy/amount from seed or settings.
- [ ] `VerdictCard` shows spray/scout/hold; footer links open **Spray records** with query params prefilled.

## Vineyards

- [ ] List loads; create vineyard (if permitted); archive flow visible and works.
- [ ] Detail: map shows blocks; **missing centroid** shows banner instead of blank failure.
- [ ] Block create/edit/delete PATCH URLs succeed (no 404 under wrong path).
- [ ] Mobile: map is usable (scroll doesn’t steal all gestures; min height visible).

## Integrations

- [ ] List shows connections or empty state; error banner on 5xx is readable.
- [ ] Pessl: **Connect** starts OAuth or surfaces 503 with partner-credentials message.
- [ ] Davis / METER paste dialogs submit; success reloads list.
- [ ] Sencrop card is clearly **Coming soon** (disabled CTA).
- [ ] Optional: `NEXT_PUBLIC_SHOW_PROVIDER_HEALTH=true` → internal JSON panel appears after `GET …/admin/provider-health` succeeds.

## Captures

- [ ] Block + date range + kind filters change the grid; empty state is clear.
- [ ] Open **detail** route; image/metadata load; **Archive** returns to list.
- [ ] ML / correction: if API has no correction fields, copy explains interpretation pending (no fake scores).

## Forecasts

- [ ] Page loads with verdict + `forecast_7d`; handles empty/partial forecast without crash.
- [ ] Program limit callouts match program settings.
- [ ] Deep links to dashboard / vineyard resolve.

## Spray records

- [ ] List + create + edit + archive; filters sync with URL.
- [ ] Prefill from `?block=&verdict=` after navigation from dashboard.
- [ ] REI/PHI line: with `rei_hours` / `phi_days` set, countdown copy matches expectation after applied time.

## Settings

- [ ] **Program** tab: load + save PATCH succeeds.
- [ ] **Privacy**: toggles POST and reload consent rows.
- [ ] **Export**: downloads JSON blob.
- [ ] **Delete**: type `delete`, POST succeeds, user signed out (verify in staging only with disposable account).
- [ ] **Members**: list loads; invite shows clear error if email unknown.
- [ ] **Notifications** / **Billing**: stubs read as “not wired” (no fake endpoints).

## Regression quickies

- [ ] `/spray` redirect when unauthenticated still works (middleware).
- [ ] No console errors on primary navigation between shell tabs.

## Known gaps (do not file as release blockers)

- Recommendation lifecycle entities, full §8.13 savings math, CSV spray import, Sencrop OAuth, notification test route, `packages/client-core` OpenAPI client — tracked in CODEBASE_PLAN pilot delta and product backlog.
