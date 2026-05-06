# Graft Spray — CLAUDE_CODE_PLAN.md

**Companion document to:** [Graft-Spray-App-Spec.md](Graft-Spray-App-Spec.md), [CODEBASE_PLAN.md](CODEBASE_PLAN.md).
**Audience:** Claude Code (or any implementing agent). Read this before starting any task on `graft-spray/main`.
**Source:** Per the original spec brief, this document exists as a standalone markdown so it can be checked into the repo and referenced by every implementing PR.
**Version:** 1.0 DRAFT.
**Date:** 2026-04-30.
**Branch:** `graft-spray/m0/spec-pdf` (PR #4).

---

## 1. Repository

- Existing repo: `https://github.com/Graft-Systems/GraftWebsite`.
- All Graft Spray work lives on the integration branch `graft-spray/main`, with feature branches off it named `graft-spray/<milestone>/<feature>` (e.g., `graft-spray/m0/postgis-schema`).
- PRs target `graft-spray/main`. `graft-spray/main` merges to `main` only at milestone closeouts (M1 web MVP launch, M2 iOS launch, etc.).
- Two milestone-zero PRs already in flight:
  - PR #2 `graft-spray/m0/research-import` (M0-00a): research dossier import. 37 of 47 paywalled sources retrieved.
  - PR #3 `graft-spray/m0/codebase-plan` (M0-00): the whole-codebase plan in CODEBASE_PLAN.md. Open as draft.
  - PR #4 `graft-spray/m0/spec-pdf` (M0-00b): this spec PDF, its source markdown, and 7 rendered diagrams.

## 2. Repo Layout (target end-of-M1)

The monorepo uses pnpm workspaces plus Turborepo. The full target tree lives in CODEBASE_PLAN.md section 2; the abbreviated view:

```
apps/
  web/          # Next.js 15 + App Router + TypeScript
  mobile/       # React Native + Expo (M2+)
services/
  api/          # Django + DRF
  ml/           # FastAPI inference (M1-10+)
  worker/       # Celery + Redis
packages/
  client-core/  # OpenAPI-generated TS client + React hooks (web + mobile)
  ui/           # Design tokens + primitive components (web + mobile)
  eslint-config/
  tsconfig/
infra/
  terraform/
  docker/
  eas/          # M2+
docs/
  spec/         # this PDF, CLAUDE_CODE_PLAN.md, CODEBASE_PLAN.md
  research/     # the brain dossier (read-only)
.github/
  workflows/
```

The migration from the existing `frontend/` plus `backend/` layout to this monorepo happens atomically in **M0-01** (the first feature PR after this plan and PR #2 / PR #3 merge). The migration plan is enumerated in CODEBASE_PLAN.md section 7.

## 3. Coding Standards

### 3.1 Python (`services/api`, `services/ml`, `services/worker`)

- Formatter: Black.
- Linter: Ruff with the project rule set (E, F, I, B, N, UP, plus `RUF`).
- Type checker: mypy in strict mode for new code; gradually for migrated code.
- Tests: pytest plus `pytest-django` for the API service. Coverage threshold 80% line on `services/api` and 70% on `services/ml`.

### 3.2 TypeScript (`apps/web`, `apps/mobile`, `packages/*`)

- Linter: ESLint flat config, shared from `packages/eslint-config`.
- Formatter: Prettier with the project config.
- Strict mode in tsconfig (`strict: true`, `noUncheckedIndexedAccess: true`).
- Tests: Vitest (web), Jest with React Native Testing Library (mobile), Playwright (web E2E), Maestro (mobile E2E, M2+).
- Coverage threshold 70% line on `apps/web` excluding generated client code in `packages/client-core/src/api/`.

### 3.3 React Native specifics (`apps/mobile`, M2+)

- No native modules outside Expo's curated list without explicit justification (keeps EAS Build simple and OTA updates safe).
- Platform-specific code in `.ios.ts`/`.android.ts` files.
- New Architecture (Fabric and TurboModules) enabled from day one.

### 3.4 Commit and PR conventions

- **Conventional Commits** (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `plan`, `spec`).
- **Squash-merge** PRs into `graft-spray/main`.
- Every PR description includes a "Spec section reference" line linking to the section of `Graft-Spray-App-Spec.md` and the section of `CODEBASE_PLAN.md` that the PR implements.
- Every PR's first commit message references the section of `CODEBASE_PLAN.md` it implements.
- **No em-dashes** in commit messages, PR descriptions, code comments, or documentation. Use commas, parens, or restructure. (Project convention; non-negotiable.)

### 3.5 Git hygiene

- `.gitattributes` enforces `* text=auto eol=lf` (per resolved Open Question Q9).
- `.gitmodules` is fixed in M0-01 to properly declare `services/api/PredictionTool` (per risk R1).
- Never commit secrets, environment files, or credentials. `.env.local` and `.env` are gitignored.

## 4. Claude Code Operating Rules

These are the rules every implementing agent must follow on `graft-spray/main`.

### 4.1 Always read the latest spec before planning a task

Before starting any task, read:
1. `docs/spec/Graft-Spray-App-Spec.pdf` (or its markdown source if PDF generation is pending).
2. `docs/spec/CODEBASE_PLAN.md`, especially the section the task implements.
3. The relevant brain category file under `docs/research/` for any technical claim cited.
4. The previous PR description if the new PR builds directly on it.

### 4.2 PR workflow

For any task:

1. Pull latest `graft-spray/main`.
2. Create the feature branch per the naming convention (`graft-spray/<milestone>/<feature>`).
3. Post a written plan in the PR description (draft) BEFORE writing implementation code. The plan must reference:
   - The spec section the PR implements.
   - The CODEBASE_PLAN section the PR implements.
   - The acceptance criteria from the spec section.
   - The data lake events the PR will emit (per spec §19).
   - The tests the PR will add (per spec §22).
4. Wait for human approval (Benson) on the plan.
5. Implement. Commit early, commit often, with Conventional Commit messages.
6. Run tests, lint, type-check locally before pushing.
7. Push and convert the PR from draft to ready-for-review.
8. Self-review against the acceptance criteria from the spec.

### 4.3 Never invent features not in the spec

If the spec is ambiguous on a point, **open an issue** tagged `spec-gap` instead of guessing. The issue:
- Cites the spec section.
- Describes the ambiguity.
- Proposes 2-3 possible interpretations with pros and cons.
- Tags Benson for resolution.

If the spec is silent on a point that blocks implementation, the same procedure applies.

### 4.4 Update CHANGELOG.md and acceptance-criteria checkboxes

Every implemented feature:
- Updates `CHANGELOG.md` at the repo root with a one-line entry under the appropriate milestone heading.
- Updates the acceptance-criteria checkboxes inside `CODEBASE_PLAN.md` and (for spec-section coverage) inside `Graft-Spray-App-Spec.md` if both have checkboxes.

### 4.5 Spec amendments and codebase-plan amendments

If during implementation a deviation from the spec or codebase plan becomes necessary:

1. **Stop implementation.**
2. Open a `spec-amendment` or `plan-amendment` issue describing the deviation, the reason, and the proposed change.
3. Update the relevant document (or both) in a dedicated PR.
4. Resume implementation only after the amendment lands.

Example: spec amendment SA-1 (live external risk-index aggregator from UC IPM and uspest.org) was added to CODEBASE_PLAN.md Appendix A on 2026-04-30 per Benson's request, then folded into spec sections 11, 12, 19, and 23.

### 4.6 Never push to remote without confirmation

The agent should:
- Commit locally freely.
- Push the feature branch on demand or per workflow.
- Never `--force` push to `main` or `graft-spray/main`.
- Never delete branches without explicit user approval.

### 4.7 Submodule etiquette

`backend/PredictionTool` (which becomes `services/api/PredictionTool` after M0-01) is a git submodule pointing at `Graft-Systems/GraftPredictionTool`. The local checkout has uncommitted internal changes that Benson has explicitly directed the agent to leave alone (resolved Open Question Q2).

Therefore:
- Never commit the submodule pointer.
- Never run `git submodule update` against the parent repo.
- The dirty working-tree state for the submodule remains for the lifetime of this draft.

If a future task genuinely requires the submodule pointer to move, open a `submodule-amendment` issue and wait for Benson.

## 5. Mandatory Whole-Codebase Plan

The whole-codebase plan required by the spec brief is `docs/spec/CODEBASE_PLAN.md`, drafted in PR #3. It contains the 14 sections required by the source brief:

1. Repository inventory (every existing file classified).
2. Target tree (end-of-M1 monorepo structure).
3. Per-file responsibility map.
4. Per-package dependency graph.
5. Module-by-module milestone allocation.
6. Branch and PR plan.
7. Migration plan for the existing marketing site.
8. Database and data-lake schema plan.
9. API surface plan.
10. Environment and secrets plan.
11. CI/CD plan.
12. Testing-strategy mapping.
13. Risk register (R1-R20).
14. Open questions (Q1-Q14, with Q1, Q2, Q9, Q12 resolved).

Plus Appendix A documenting spec amendments (SA-1 at present).

**Approval gate.** No feature branch may merge into `graft-spray/main` until PR #3 (CODEBASE_PLAN) is approved and PR #4 (this spec PDF) is approved.

## 6. Initial Task List for Claude Code

The ordered list of feature PRs against `graft-spray/main`. Each PR's branch, title, scope, base, and dependencies match CODEBASE_PLAN.md section 6. Restated here for the implementing agent's quick reference.

### M0 — Foundations

| # | Branch | PR Title | Depends on |
|---|---|---|---|
| 0a | `graft-spray/m0/research-import` | M0-00a: Import research dossier | (PR #2, in flight) |
| 0 | `graft-spray/m0/codebase-plan` | M0-00: Whole-Codebase Plan | (PR #3, in flight) |
| 0b | `graft-spray/m0/spec-pdf` | M0-00b: Application Specification (this PR #4) | (in flight) |
| 1 | `graft-spray/m0/repo-bootstrap` | M0-01: Monorepo bootstrap (pnpm + Turborepo) | M0-00 + Q3 |
| 2 | `graft-spray/m0/auth-identity` | M0-02: Account and identity (Clerk) | M0-01 + Q8 |
| 2a | `graft-spray/m0/website-integration` | M0-02a: Website integration (`/spray` nav, app shell) | M0-02 + Q5, Q6 |
| 3 | `graft-spray/m0/postgis-schema` | M0-03: Postgres + PostGIS schema | M0-02 + Q3 |
| 4 | `graft-spray/m0/data-lake-ingest` | M0-04: Data-lake ingest service | M0-03 |
| 5 | `graft-spray/m0/maps-polygon-draw` | M0-05: Satellite map + polygon draw | M0-03 + Q4 |
| 6 | `graft-spray/m0/weather-adapter-napa` | M0-06: Weather adapter (Napa, Sonoma) | M0-03 |
| 6b | `graft-spray/m0/external-risk-index-feeds` | M0-06b: External risk-index aggregator (SA-1) | M0-06 |

### M1 — Web MVP

| # | Branch | PR Title | Depends on |
|---|---|---|---|
| 7 | `graft-spray/m1/risk-engine-gubler-thomas` | M1-07: Gubler-Thomas risk engine | M0-06 + 06 P1, P2 papers |
| 8 | `graft-spray/m1/risk-engine-dmcast` | M1-08: DMCast risk engine | M0-06 + 06 P5 paper |
| 9 | `graft-spray/m1/capture-upload-web` | M1-09: Photo and video capture (web) | M0-04 |
| 10 | `graft-spray/m1/ml-inference-cloud` | M1-10: Cloud ML inference (FastAPI) | M1-09 |
| 11 | `graft-spray/m1/ml-correction-loop` | M1-11: ML correction loop | M1-10 |
| 12 | `graft-spray/m1/recommendation-engine-v1` | M1-12: Recommendation engine v1 | M1-07, M1-08, M1-10 |
| 13 | `graft-spray/m1/savings-tracker` | M1-13: Savings tracker | M1-12 |
| 14 | `graft-spray/m1/integrations-panel` | M1-14: Integrations panel + spray history import | M0-03 |
| 15 | `graft-spray/m1/chatbot-rag` | M1-15: Gemini chatbot (RAG over docs/research/) | M0-04 |
| 16 | `graft-spray/m1/notifications-web-push` | M1-16: Web push notifications | M1-12 |
| 17 | `graft-spray/m1/data-export-and-deletion` | M1-17: Data export + account deletion | M0-04 |
| 18 | `graft-spray/m1/i18n-foundation` | M1-18: i18n foundation (English baseline + locale switcher) | M0-01 |
| 19 | `graft-spray/m1/observability` | M1-19: Sentry + OpenTelemetry + audit logs | M0-01 |
| 20 | `graft-spray/m1/security-hardening` | M1-20: Rate limits, CSP, dependency scanning, tenant-isolation tests | All others |
| 21 | `graft-spray/m1/qa-and-launch-checklist` | M1-21: A11y audit, perf budget, security scan, web MVP launch | All others |

### M2 — iOS launch

Subsequent PRs follow the same template, branch convention `graft-spray/m2/<feature>`. Detailed list lands when M1 closeout is signed off.

### M3, M4, M5, M6+

Same template per region per CODEBASE_PLAN section 6. Detailed task lists land at the start of each milestone.

## 7. Definition of Done per Milestone

A milestone is closed when:

| Criterion | Owner |
|---|---|
| All milestone tasks merged to `graft-spray/main`. | Builder |
| All acceptance criteria from the relevant spec sections checked off. | Builder + Strategist |
| `CODEBASE_PLAN.md` updated to reflect what shipped vs. what was planned (diff summarized in the closeout issue). | Strategist |
| `Graft-Spray-App-Spec.md` "Implementation Status" section updated. | Scribe |
| `CLAUDE_CODE_PLAN.md` (this document) updated if any of the operating rules or PR plan changed. | Strategist |
| Demo recording attached to the milestone closeout issue. | Builder + Creator |
| Stakeholder sign-off comment by Benson on the milestone closeout issue. | Benson |
| Production deploy verified per the milestone-specific manual QA checklist (per spec §22.7). | Strategist |
| `graft-spray/main` fast-forwarded to `main` (M1, M2, M3, M4, M5 only; intermediate milestones stay on `graft-spray/main`). | Builder |

## 8. References

- [docs/spec/Graft-Spray-App-Spec.md](Graft-Spray-App-Spec.md) (or `.pdf` once generated) — the full specification.
- [docs/spec/CODEBASE_PLAN.md](CODEBASE_PLAN.md) — the whole-codebase plan with risk register and open questions.
- [docs/spec/_source/original-spec-brief.md](_source/original-spec-brief.md) — Benson's original brief that this document exports.
- [docs/research/](../research/) — the read-only research dossier.

---

**End of CLAUDE_CODE_PLAN.md.**

Updated at every milestone closeout. The implementing agent reads this document, the spec PDF, and CODEBASE_PLAN before starting any task on `graft-spray/main`.
