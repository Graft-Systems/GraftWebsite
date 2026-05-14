# Workflow Rules

The conventions Benson works to. Following them keeps the codebase coherent.

## Branch model

- `graft-spray/main` is the working branch for Graft Spray work. All PRs target it.
- `main` is the legacy marketing-site branch. Touch ONLY for marketing-site fixes that don't impact `/spray/*`.
- Feature branches: `graft-spray/m1.5/<short-name>` (e.g. `graft-spray/m1.5/sensor-pessl`).
- Hotfix branches: `graft-spray/hotfix/<short-name>` (e.g. `graft-spray/hotfix/rls-guc-atomic`).
- All merges into `graft-spray/main` are **squash-merge** so the history stays one-commit-per-PR.

## Plan-first protocol

Every non-trivial PR begins with a written plan committed to `docs/spec/_plans/<name>-plan.md`. Implementation begins **after Benson approves the plan**.

Existing examples to model:
- `docs/spec/_plans/M0-04-plan.md` (data lake)
- `docs/spec/_plans/M1.5-PR-D-plan.md` (Pessl)
- `docs/spec/_plans/M1.5-PR-E-plan.md` (Davis + METER)
- `docs/spec/_plans/M1.5-PR-F5-plan.md` (LLM brief)

The plan covers: goal, decisions to lock (with questions Q1...QN), pre-flight checklist, architecture, step-by-step implementation, test plan, risks, out-of-scope, acceptance criteria.

Trivial PRs (one-line fix, doc typo) can skip the plan. The bar for "trivial" is low: if you'd struggle to articulate the change in 10 words, write a plan.

## Conventional Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(spray): M1.5 PR-D Pessl FieldClimate sensor connector (OAuth 2.0)
fix(spray): wrap useSearchParams in Suspense for Next 15 prerender
docs(handoff): 2026-05-08 snapshot for incoming dev
```

Scope is the area touched (`spray`, `web`, `worker`, `docs`, `infra`).

PR titles match the squash-commit title.

## No em-dashes ( - )

Benson dislikes em-dashes. Use commas, parens, or restructure. This rule applies to:
- Commit messages
- PR descriptions
- Code comments
- Markdown docs
- Chat replies in the assistant transcripts

Hyphens (-) and en-dashes (–) are fine. Just no em-dash ( - ). Inline code blocks are exempt (em-dash in a regex or string is fine).

## Pull request shape

PR description template (Benson's preferred):

```
## Summary

- <1-3 bullets capturing what changed and why>

## What changed

**Backend** (...)
- <bullets>

**Frontend** (...)
- <bullets>

**Tests** (...)
- <bullets>

## Scope cuts (deferred)

- <list of stuff explicitly NOT done>

## Pre-flight (Benson, deferred - not blocking merge)

- <manual steps Benson owns>

## Test plan

- [ ] CI: pytest ... - all green
- [ ] Local: pnpm --filter web build
- [ ] Vercel preview: <smoke test>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Files NOT to touch unless explicitly scoped

- `services/api/PredictionTool/` - old submodule, dirty by design.
- `frontend-cinematic/` - vestigial directory at repo root, intentionally left alone (per Q1 resolution in CODEBASE_PLAN.md §14).
- `services/api/api/` - legacy app for the existing PredictionTool views. Not part of spray.

## Migration discipline

- Every schema change is a migration. Never edit a previous migration once merged.
- RLS policy changes go in their own migration (model 0003 set the template).
- Raw SQL is fine for PostGIS extension setup + GIST indexes + RLS policies.
- Migrations must be reversible (write the REVERSE_SQL alongside the FORWARD_SQL).

## Test discipline

- Pytest for backend. Vitest for frontend. CI runs both on every PR.
- Mock all HTTP calls via `responses` (Python) or vitest mocks. Real HTTP in tests is forbidden.
- Use `moto` to mock S3.
- Tests that need Postgres + PostGIS use the `postgis/postgis:16-3.4` service container in CI. There's no SQLite fallback for spray models because of spatial fields.
- New schemas require a passing payload + a rejecting payload test in `test_schema_registry.py`.

## Manual vs auto deploys

- **Vercel**: auto-deploys on push to `main` for production; PR previews on every push to any branch.
- **Render API + Worker**: auto-deploys on push to `graft-spray/main`. Both services watch the same branch but only the API has a "build the frontend assets" step; the worker just installs Python deps.
- **No env-var change auto-deploys** - manual restart in Render dashboard if you change a var.

## Squash-merge etiquette

- The squash-commit message should be the PR's title.
- The squash-commit description should be the PR's body, lightly edited (Benson tends to keep the full body).
- Squash, don't merge or rebase, into `graft-spray/main` - keeps history clean.

## Two-track concurrent work

You and Benson can both be developing at the same time on separate branches off `graft-spray/main`. Coordinate on:
- Files in `services/api/spray/views.py` (high churn; everyone edits this)
- `services/api/spray/urls.py` (every PR adds routes)
- `CHANGELOG.md` (every PR adds entries; expect merge conflicts here, resolve by keeping both entries)
- `services/api/spray/serializers.py` (medium churn)
- `services/api/graft_api/settings.py` (env var additions)

Conflict-prone files. Pull main frequently when working on a long-lived branch.

## What Benson does NOT want

- Em-dashes anywhere.
- Surprise behavior changes without a plan.
- Direct pushes to `graft-spray/main` (squash-merge via PR is the only path).
- Skipping the no-blackbox-changes rule (every commit's purpose should be readable in its message).
- Adding new external services / vendors without a plan + Q&A discussion.
