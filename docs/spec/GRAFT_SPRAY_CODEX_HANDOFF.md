# Graft Spray Codex Handoff

Last updated: 2026-05-12

## Purpose

This handoff lets a new Codex project continue development of the Graft Spray platform without replaying the prior conversation. The current objective is a pilot-ready winegrower product: a vineyard manager should be able to open Graft Spray, complete setup, understand block-level mildew risk, see when/what/where/when-not-to-spray, trust the evidence, and use the app in the field without dead ends.

## Repository State

- Repo: `/Users/bensonklein/Documents/GraftWebsite`
- Branch: `graft-spray/main`
- Remote: `origin https://github.com/Graft-Systems/GraftWebsite.git`
- Local status at handoff creation: clean
- Latest pushed commit:
  - `733a0e1 feat(spray): build pilot manager workflow`

Recent relevant commits:

```text
733a0e1 feat(spray): build pilot manager workflow
b9ce943 fix(web): align nav login link
6c14e6a feat(spray): add pilot onboarding loop
e062b3b chore(monorepo): add api workspace and spray verification targets
5e69116 feat(spray): fuse sensor weather evidence into verdict directives
```

## Product Direction

Graft Spray is being shaped as vineyard mildew decision intelligence, not an automated pesticide prescription system. `BlockVerdict` is the canonical decision object. The grower-facing output should answer:

- What is my mildew risk?
- When should I spray?
- What should I spray?
- Where should I spray?
- When should I not spray?
- Why did the system reach this verdict?

The guiding principle is deliberate evidence fusion with an AI/semantic layer: weather providers, on-site sensors, service-provider data, and mildew models should be combined in ways that preserve meaning, provenance, confidence, and auditability.

## Implemented So Far

### Evidence Fusion And Directives

Implemented in and around:

- `services/api/spray/aggregation/`
- `services/api/spray/recommendation/`
- `services/worker/graft_worker/tasks/`
- `services/api/spray/serializers.py`
- `apps/web/components/spray/VerdictCard.tsx`

Key behavior:

- Fused sensor/weather evidence feeds verdict computation.
- `BlockVerdictSerializer` exposes a grower-facing `directive`.
- Directives include risk/action/urgency, when to spray, what to spray, where to spray, when not to spray, confidence/evidence, and audit trace hooks.
- Worker aggregation uses fused block evidence and preserves provenance.

### Pilot Onboarding Loop

Implemented in:

- `apps/web/app/spray/(app)/dashboard/page.tsx`
- `apps/web/app/spray/(app)/onboarding/page.tsx`
- `apps/web/app/spray/(app)/integrations/page.tsx`
- `apps/web/app/spray/(app)/integrations/[conn_id]/page.tsx`
- `services/api/spray/management/commands/seed_spray_demo.py`

Key behavior:

- Dashboard setup checklist: create vineyard, draw blocks, connect sensor, map station, generate verdict.
- No-verdict states point to the exact next setup step.
- Integration pages show station health, mapped/unmapped states, stale data, and linked blocks.
- Demo seed command creates a Napa/Sonoma-style demo with believable spray/scout/hold outcomes.

Demo command:

```bash
cd services/api
python manage.py seed_spray_demo --org-name "Graft Demo Vineyard"
```

### Pilot Manager Workflow

Implemented in latest commit `733a0e1`.

Backend:

- Added `SprayRecord` model and migration:
  - `services/api/spray/models.py`
  - `services/api/spray/migrations/0010_spray_record.py`
- Added RLS policy for `spray_sprayrecord`.
- Added `SprayRecordSerializer`.
- Added endpoints:
  - `GET /api/spray/orgs/<org_id>/dashboard-summary`
  - `GET/POST /api/spray/orgs/<org_id>/spray-records`
  - `GET/PATCH/DELETE /api/spray/orgs/<org_id>/spray-records/<record_id>`
  - `GET/PATCH /api/spray/orgs/<org_id>/program-settings`
  - `POST /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/recompute`
- Added dashboard summary view for setup status, vineyards, blocks, latest verdicts, integration health, station mapping health, and latest generated timestamps.
- Added org-level spray program settings in `Org.settings["spray_program"]`.
- Directive generation now considers program limits and emits `spray_window`.
- Demo seed now creates spray program settings and a demo spray record.

Frontend:

- Added shared client/hooks in `apps/web/lib/sprayApi.ts`:
  - `useAuthedSprayFetch`
  - `useActiveOrg`
  - `useSprayDashboard`
  - `useVineyardsAndBlocks`
  - `useIntegrationsHealth`
- Reworked dashboard around "Today's work."
- Added minimal real pages for routes that were previously sidebar dead ends:
  - `apps/web/app/spray/(app)/forecasts/page.tsx`
  - `apps/web/app/spray/(app)/spray-records/page.tsx`
  - `apps/web/app/spray/(app)/settings/page.tsx`
- Updated `SprayShell` with integrations nav and mobile bottom nav.
- Updated `VerdictCard` with spray window and compact evidence preview.
- Added PNG typing in `apps/web/types/assets.d.ts`.
- Added web ESLint config and fixed test typing issues.

Hardening:

- Removed `continue-on-error` from CI lint/typecheck/test steps.
- Updated `Makefile` so `make setup-api` requires Python 3.13 and refuses an incompatible existing venv.

## Verification Already Run

Passed:

```bash
python3.13 -m py_compile services/api/spray/migrations/0010_spray_record.py services/api/spray/models.py services/api/spray/serializers.py services/api/spray/views.py services/api/spray/recommendation/directive.py services/api/spray/management/commands/seed_spray_demo.py services/api/spray/tests/test_dashboard_summary.py services/api/spray/tests/test_spray_records.py services/api/spray/tests/test_program_settings.py
python3 scripts/check_event_schemas.py
git diff --check
corepack pnpm --filter @graft/web lint
corepack pnpm --filter @graft/web typecheck
corepack pnpm --filter @graft/web test
corepack pnpm --filter @graft/web build
```

Web test status:

- 8 test files passed.
- 21 tests passed.
- One existing React `act(...)` warning remains in `CreateVineyardDialog` tests.

Backend pytest status:

- Full backend pytest did not run locally because the current local Python environment is not ready:
  - `python3` is Python 3.14 and missing `dj_database_url`.
  - `python3.13` is available but does not have pytest/dependencies installed.
  - Existing `services/api/.venv` was Python 3.14; `Makefile` now detects and refuses this incompatible venv.
- Next Codex should fix the API dev environment before trusting backend test coverage.

## Known Constraints And Guardrails

- Keep the existing Django/Celery/Next architecture.
- Do not revive the scratch TypeScript scaffold in `/Users/bensonklein/Documents/New project`.
- Avoid unrelated refactors.
- Respect tenant isolation and RLS patterns.
- Do not let agents commit directly if using agent delegation; Codex should integrate, verify, commit, and push.
- Keep grower-facing UI plain and operational. Avoid endpoint names, internal jargon, and spec language.
- Product should stay decision-support oriented with audit trail and disclaimers.

## Current Important Files

Backend:

- `services/api/spray/models.py`
- `services/api/spray/views.py`
- `services/api/spray/urls.py`
- `services/api/spray/serializers.py`
- `services/api/spray/recommendation/directive.py`
- `services/api/spray/management/commands/seed_spray_demo.py`
- `services/api/spray/tests/test_dashboard_summary.py`
- `services/api/spray/tests/test_program_settings.py`
- `services/api/spray/tests/test_spray_records.py`
- `services/api/spray/tests/test_seed_spray_demo.py`

Frontend:

- `apps/web/lib/sprayApi.ts`
- `apps/web/app/spray/(app)/dashboard/page.tsx`
- `apps/web/app/spray/(app)/forecasts/page.tsx`
- `apps/web/app/spray/(app)/spray-records/page.tsx`
- `apps/web/app/spray/(app)/settings/page.tsx`
- `apps/web/app/spray/(app)/integrations/page.tsx`
- `apps/web/app/spray/(app)/integrations/[conn_id]/page.tsx`
- `apps/web/components/spray/SprayShell.tsx`
- `apps/web/components/spray/VerdictCard.tsx`

Planning/spec:

- `docs/spec/CODEBASE_PLAN.md`
- `docs/spec/CLAUDE_CODE_PLAN.md`
- `docs/spec/Graft-Spray-App-Spec.md`

## Recommended Next Work

### 1. Fix API Local Reproducibility

Goal: make backend verification boring.

Tasks:

- Remove or rebuild the incompatible `services/api/.venv`.
- Make `make setup-api` install dependencies using Python 3.13.
- Resolve the `torch==2.11.0+cpu` dependency issue if it blocks setup on this machine.
- Run:

```bash
cd services/api
python3.13 -m pytest spray/tests/ -q
```

Acceptance:

- API tests run locally under Python 3.13.
- New dashboard summary, spray records, program settings, recompute, and demo seed tests pass.

### 2. Polish The Pilot Dashboard In Browser

Goal: make the field experience feel calm, clear, and demo-ready.

Tasks:

- Run the web app locally and inspect dashboard, forecasts, spray records, settings, integrations, and mobile bottom nav.
- Use a seeded demo account or mock API state to check:
  - empty setup
  - partial setup
  - complete demo vineyard
  - stale sensors
  - no verdict
  - spray/scout/hold verdicts
- Tighten spacing, hierarchy, mobile tap targets, and copy.

Commands:

```bash
corepack pnpm --filter @graft/web dev
```

Acceptance:

- Mobile field-width view is readable.
- Dashboard immediately answers "what needs attention today?"
- No dead-end states remain.

### 3. Finish Operational Spray Windows

Goal: make "when to spray" depend on forecast windows and grower program settings, not only current urgency.

Tasks:

- Use `BlockVerdict.forecast_7d` as the initial forecast source.
- Compute safe/unsafe spray windows based on:
  - wind
  - rain
  - temperature
  - stale data
  - org spray program limits
- Distinguish:
  - "Spray in next 24h"
  - "Scout first"
  - "Hold"
  - "Do not spray today"
  - "Next likely safe window"
- Add backend tests that prove settings deterministically affect directive text.

Acceptance:

- `directive.spray_window` is specific enough to drive field decisions.
- Forecasts page shows the same logic in an understandable 7-day view.

### 4. Make Spray Records Actually Useful

Goal: spray records support manager operations and auditability.

Tasks:

- Add editing/deleting flows if not already smooth.
- Link spray record creation from a verdict card.
- Pre-fill block/verdict/product where possible.
- Add record filtering by vineyard/block/date.
- Consider CSV/PDF export after pilot feedback.

Acceptance:

- A manager can record a spray from the directive context in under a minute.
- Records are tenant-scoped and linked back to verdict evidence when available.

### 5. Add Provider/Admin Health

Goal: make stale data visible before it damages trust.

Tasks:

- Add admin/provider health page or panel for:
  - stale integrations
  - failed pulls
  - unmapped stations
  - missing readings
  - old verdicts
- Log recompute requests and worker failures with org/block context.
- Add dashboard warning when verdicts are older than expected.

Acceptance:

- Demo operators can see why a directive is stale or missing.
- Growers see clear "data is stale" language instead of silent uncertainty.

## Suggested Agent Workflow

If using a team of agents again, keep Codex as lead/integrator and launch bounded workers in separate worktrees:

```bash
scripts/claude-agent api "Fix API local reproducibility and backend test failures for Graft Spray. Work only in services/api and Makefile unless a narrowly required dependency file must change. Do not commit."
```

```bash
scripts/claude-agent web "Polish the Graft Spray pilot dashboard and mobile field UX. Work only in apps/web. Focus on dashboard, forecasts, spray records, settings, integrations, loading/empty/error/stale states, and responsive layout. Do not commit."
```

```bash
scripts/claude-agent worker "Improve operational spray-window intelligence using existing forecast_7d and org program settings. Work in services/api/spray/recommendation and services/worker only. Preserve audit traces. Do not commit."
```

After integration, launch QA/review:

```bash
scripts/claude-agent reviewer "Review the integrated Graft Spray changes against origin/graft-spray/main for bugs, regressions, tenant-isolation risks, unsafe assumptions, and missing tests. Do not commit."
```

```bash
scripts/claude-agent qa "Run available API and web checks for the integrated Graft Spray changes. Report exact commands, failures, and dependency blockers. Do not commit."
```

## Baseline Check Commands For Next Slice

Run before committing future changes:

```bash
python3.13 -m py_compile services/api/spray/aggregation/*.py services/api/spray/recommendation/*.py services/worker/graft_worker/tasks/*.py
python3 scripts/check_event_schemas.py
git diff --check
corepack pnpm --filter @graft/web lint
corepack pnpm --filter @graft/web typecheck
corepack pnpm --filter @graft/web test
corepack pnpm --filter @graft/web build
```

Once API dependencies are fixed:

```bash
cd services/api
python3.13 -m pytest spray/tests/ -q
```

## Definition Of Winegrower Pilot Ready

Minimum bar for an intro demo:

- Seeded demo vineyard shows three believable block outcomes: spray, scout, hold.
- Dashboard shows setup checklist and today's directive without dead ends.
- Integrations show provider and station health, including stale/unmapped states.
- A manager can refresh a directive.
- A manager can view a 7-day block forecast.
- A manager can record a spray.
- Verdict card explains why the recommendation exists with enough evidence to build trust.
- Mobile view is readable in the field.
- Backend test suite runs locally under Python 3.13.

