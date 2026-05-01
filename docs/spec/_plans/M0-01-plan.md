# M0-01 Plan — Monorepo Bootstrap (pnpm + Turborepo)

**Status:** PLAN ONLY. No code changes in this commit. Implementation starts only after Benson approves.
**Branch:** `graft-spray/m0/repo-bootstrap`
**PR target:** `graft-spray/main`
**Spec section reference:** [`Graft-Spray-App-Spec.md` §14 + §23.1](../Graft-Spray-App-Spec.md), [`CODEBASE_PLAN.md` §7](../CODEBASE_PLAN.md)
**Estimated diff size:** Large. Hundreds of file moves; minimal in-file content changes.
**Estimated effort:** 7 to 10 hours of work, mostly mechanical, plus ~30 min of manual Vercel-dashboard work that only Benson can do.

---

## 1. Goal

Restructure the existing `Graft-Systems/GraftWebsite` repo into the pnpm + Turborepo monorepo specified in CODEBASE_PLAN §2, **without breaking either of the existing production deployments** (Vercel for the marketing site at `frontend/`, Render for the Django API at `backend/`).

This is the heaviest single PR in the entire roadmap. Doing it carefully matters; reviewing the plan before any file moves is the operating-rules contract per CLAUDE_CODE_PLAN §4.2.

## 2. Decisions locked from CODEBASE_PLAN open questions

These constrain the plan; no need to revisit during implementation.

| Q | Resolution | Affects |
|---|---|---|
| Q1 | `frontend-cinematic/` stays at repo root, untouched. NOT moved into `apps/`. | Step 2 must NOT touch it. |
| Q2 | `backend/PredictionTool` submodule untouched. Working-tree dirty state stays as-is. | Step 3 `git mv` preserves the submodule pointer; do not commit any submodule pointer changes. |
| Q9 | Add `.gitattributes` with `* text=auto eol=lf`. | Step 1. |
| Q11 | Set up Git LFS for dataset folders (track `*.pdf`, `*.zip`, `*.h5`, `*.npz`, `*.parquet`, `docs/research/assets/*/datasets/**`). | Step 1 + a follow-up dedicated `graft-spray/m0/dataset-import` PR. |
| Q12 | Orphan branches (`add-animation-libs`, `cinematic-frontend`, `sync-cinematic-fixes`) are abandoned. | Do not touch them; do not merge them; they remain on origin as historical record. |

## 3. Pre-flight checklist (BEFORE any file moves)

These must be captured and confirmed in the PR description before merge.

| Check | Captured by | Status |
|---|---|---|
| Vercel project root directory (currently `frontend`) | Benson via Vercel dashboard screenshot | Pending |
| Vercel build command | Benson | Pending |
| Vercel output directory | Benson | Pending |
| Vercel environment variables list (`BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, any others) | Benson | Pending |
| Render service `rootDir` (currently `backend`) | Benson via Render dashboard | Pending |
| Render build/start commands | Already in `render.yaml`, locked at `cf68b1b` | Captured |
| Render environment variables | CODEBASE_PLAN §10 | Captured |
| Tag `pre-monorepo` on `graft-spray/main` (immediate rollback ref) | Builder, in this PR's first commit | To do |
| Verify `graft-spray/main` builds + tests cleanly before any changes | Builder, locally | To do |

## 4. Migration steps (atomic, in this order)

Each step is a separate commit on this branch with a Conventional Commit message. The branch squash-merges into `graft-spray/main` only after all steps verify green.

### Step 1: Workspace scaffolding (no file moves)

Files added at repo root:

- `package.json` — root workspace manifest with `pnpm` scripts and `workspaces` field.
- `pnpm-workspace.yaml` — declares `apps/*`, `services/*`, `packages/*`.
- `turbo.json` — pipeline definitions for `build`, `dev`, `lint`, `test`, `type-check`.
- `.gitattributes` — `* text=auto eol=lf` plus the Git LFS tracking patterns from Q11.
- `.gitignore` — extend with `.turbo/`, `apps/*/dist/`, `apps/*/.next/`, `services/*/__pycache__/`, etc.

Empty directories with `.gitkeep`:

- `apps/`, `services/`, `packages/`, `infra/terraform/`, `infra/docker/`, `.github/workflows/`.

Git LFS:

- `git lfs install` (per-repo).
- `.gitattributes` patterns: `*.pdf filter=lfs diff=lfs merge=lfs -text`, etc.
- LFS quota provisioned on the GitHub side (Benson's action: confirm or upgrade plan).

**Verification:** `pnpm install` succeeds at repo root with zero workspaces (since `apps/*` etc. are empty).

### Step 2: Move `frontend/` to `apps/web/`

```bash
git mv frontend apps/web
```

In-file edits inside `apps/web/`:

- `package.json`: change `name` field to `@graft/web`.
- `next.config.mjs`: re-verify the `/api/*` rewrite target (BACKEND_URL stays the same).
- `tsconfig.json`: extend `packages/tsconfig/nextjs.json` (Step 7 lands `tsconfig`).
- `eslint.config.mjs`: extend `packages/eslint-config/nextjs.js` (Step 7).

**Note (Q1).** `frontend-cinematic/` stays at repo root, NOT moved into `apps/`.

**Verification:** `pnpm --filter @graft/web build` succeeds.

### Step 3: Move `backend/` to `services/api/`

```bash
git mv backend services/api
```

In-file edits inside `services/api/`:

- `manage.py`: no change (Django uses relative paths).
- `graft_api/settings.py`: verify `BASE_DIR` resolution; should be unchanged.
- The submodule `services/api/PredictionTool/` (was `backend/PredictionTool/`) carries forward with its dirty working-tree state per Q2. **Do not commit any submodule pointer changes in this PR.**

**Note (R2).** The submodule's dirty state will follow into `apps/services/api/PredictionTool/`. That is expected and confirmed by Q2.

**Verification:** From `services/api/`, `python manage.py check` passes.

### Step 4: Update `render.yaml`

- Change `rootDir: backend` to `rootDir: services/api`.
- Update `buildCommand` and `startCommand` if they referenced `backend/...`.
- All env-var keys from CODEBASE_PLAN §10 stay unchanged (still set in Render dashboard).

**Verification:** Render auto-deploys on push and the new build succeeds. Smoke test `/api/contact`, `/api/estimate`, `/api/waitlist` against the new deploy.

### Step 5: Update Vercel project settings (MANUAL, R17)

This is the **only step Benson must do via the Vercel web UI**:

1. Open the Vercel project for `graftsystems.com`.
2. Settings → General → Root Directory → change from `frontend` to `apps/web`.
3. Settings → Build & Deployment → confirm the build command and output directory still point at `apps/web/.next` (Vercel auto-detects).
4. Trigger a deploy from the `graft-spray/m0/repo-bootstrap` branch and verify a Vercel preview renders the marketing pages unchanged.

**Mitigation for R17:** This PR's description includes a screenshot of the pre-existing Vercel settings, taken before Step 5. If the deploy fails post-merge, Benson reverts the Root Directory in the same place.

A `vercel.json` at the repo root *cannot* set Root Directory (that is a project-level setting), so this manual step is unavoidable. Documented for future operators.

### Step 6: Extract shared UI primitives

```bash
git mv apps/web/components/ui packages/ui/src/components
```

Files added:

- `packages/ui/package.json` (`@graft/ui`).
- `packages/ui/tsconfig.json`.
- `packages/ui/tailwind.config.ts` exporting the shared theme.
- `packages/ui/src/tokens/index.ts` with brand colors, typography, spacing extracted from `apps/web/tailwind.config.ts`.
- `packages/ui/src/index.ts` re-exporting components and tokens.

In-file edits inside `apps/web/`:

- `tailwind.config.ts`: extend `@graft/ui` config; remove the duplicated tokens.
- All `@/components/ui/*` imports rewrite to `@graft/ui` (codemod via `pnpm --filter @graft/web exec tsx ./scripts/rename-ui-imports.ts`; one-shot script committed and then deleted in the same PR for traceability).

**Verification:** `pnpm --filter @graft/web build` still succeeds.

### Step 7: Scaffold `packages/eslint-config`, `packages/tsconfig`, `packages/client-core`

- `packages/eslint-config/`: shared ESLint flat config with three exports (`nextjs.js`, `react-native.js`, `node.js`).
- `packages/tsconfig/`: `base.json`, `nextjs.json`, `react-native.json`, `node.json`. All apps/services extend from one of these.
- `packages/client-core/`: empty skeleton with `package.json`, `tsconfig.json`, `src/index.ts`. Real OpenAPI-generated content lands in M0-04.

**Verification:** `pnpm install` resolves all workspaces; `pnpm lint` passes (or shows expected zero violations).

### Step 8: Fix `.gitmodules` (R1)

Current state of `.gitmodules` is broken: missing the entry for `backend/PredictionTool` (or `services/api/PredictionTool` after Step 3).

Add:

```
[submodule "services/api/PredictionTool"]
  path = services/api/PredictionTool
  url = https://github.com/Graft-Systems/GraftPredictionTool.git
```

**Verification:** `git submodule status` reports the submodule cleanly. `git submodule update --init` succeeds for a fresh clone.

### Step 9: CI workflow

Files added under `.github/workflows/`:

- `ci.yml`: runs on every PR and push to `graft-spray/main`. Steps:
  - Checkout (with submodules; LFS pull).
  - Install pnpm, Node 20, Python 3.13.
  - `pnpm install --frozen-lockfile`.
  - `pnpm turbo run lint test type-check build` across all workspaces.
  - Upload coverage to Codecov (or skip until M0-04).
- `deploy-web.yml`: stub; Vercel handles deploy automatically. Could be removed if not useful.
- `deploy-api.yml`: stub; Render handles deploy via webhook.

Branch protection (configured in GitHub settings, not in this PR):

- `graft-spray/main` and `main` require `ci.yml` green before merge.
- Force pushes blocked on both.

### Step 10: README and CONTRIBUTING

- Root `README.md`: rewrite to monorepo overview. Sections: what's where, how to run locally, how to contribute (pointer to `CONTRIBUTING.md`).
- `apps/web/README.md`: web app specifics.
- `services/api/README.md`: API specifics.
- `CONTRIBUTING.md` (new at repo root): documents the PR workflow per CLAUDE_CODE_PLAN, no-em-dashes rule, Conventional Commits, squash merges.
- `CHANGELOG.md` (new at repo root): inaugural entry under M0-01.

### Step 11: Verification before merge

- [ ] `pnpm install` succeeds at repo root.
- [ ] `pnpm turbo run build` builds every workspace.
- [ ] `pnpm turbo run test` passes (initial suites minimal but framework in place).
- [ ] `pnpm turbo run lint` passes.
- [ ] `pnpm turbo run type-check` passes.
- [ ] Vercel preview deploy renders marketing pages unchanged.
- [ ] Render preview deploy serves `/api/contact`, `/api/estimate`, `/api/waitlist` unchanged.
- [ ] `git submodule status` reports the submodule cleanly.
- [ ] `git lfs ls-files` is non-empty (proves LFS is operational).

## 5. Rollback plan

If anything breaks after this merge to `graft-spray/main`:

1. Revert the M0-01 squash-merge commit on `graft-spray/main` via `git revert <sha> -m 1`.
2. (If already promoted to `main`) Revert the merge commit on `main` the same way.
3. **Vercel:** dashboard → Settings → General → Root Directory → revert from `apps/web` back to `frontend`.
4. **Render:** edit `render.yaml` (or revert to a pre-merge commit) to restore `rootDir: backend`.
5. The `pre-monorepo` tag (created in Step 1) is the immediate fallback ref. `git checkout pre-monorepo` reproduces the pre-migration state exactly.

The full rollback is documented at `docs/runbooks/m0-01-rollback.md` (file added in this PR alongside Step 1).

## 6. Risks revisited

| Risk | Mitigation in this PR |
|---|---|
| R1 (broken `.gitmodules`) | Step 8 fixes it. |
| R2 (submodule dirty state) | Q2 resolved: leave alone. Step 3 `git mv` preserves the dirty state in the new path. Verified by reviewer. |
| R10 (LF/CRLF on Windows) | Step 1 `.gitattributes`. Existing files normalize on next git operation; documented in CHANGELOG. |
| R15 (no test infrastructure) | Step 9 scaffolds Vitest, pytest, Playwright via Turborepo pipeline. |
| R17 (Vercel root directory manual setting) | Step 5 is explicit; Benson captures pre-existing Vercel settings in this PR description before changes; rollback is one click. |

## 7. Acceptance criteria

- [ ] `graft-spray/main` builds and deploys without manual intervention after squash-merge.
- [ ] Marketing pages (`/`, `/about`, `/contact`, `/tool`) render unchanged at Vercel preview.
- [ ] Existing API endpoints (`/api/contact`, `/api/estimate`, `/api/waitlist`) continue to work at Render preview.
- [ ] `pnpm install`, `pnpm turbo run build|test|lint|type-check` all succeed at repo root.
- [ ] `frontend/` and `backend/` directories no longer exist; `apps/web/` and `services/api/` exist with full git history preserved (`git log --follow` shows pre-rename history).
- [ ] `frontend-cinematic/` directory is unchanged at repo root (Q1).
- [ ] `apps/`, `services/`, `packages/`, `infra/`, `.github/` exist per CODEBASE_PLAN §2.
- [ ] `.gitattributes` enforces LF line endings and tracks LFS patterns (Q9, Q11).
- [ ] `.gitmodules` properly declares `services/api/PredictionTool` (R1).
- [ ] Vercel root directory updated to `apps/web` (manual; verified by Benson).
- [ ] Render `rootDir` updated to `services/api`.
- [ ] `CHANGELOG.md` updated with the M0-01 entry.
- [ ] CODEBASE_PLAN.md and CLAUDE_CODE_PLAN.md acceptance-criteria checkboxes updated for M0-01.
- [ ] `docs/runbooks/m0-01-rollback.md` exists.

## 8. Open questions

None blocking. All M0-01 prerequisites are resolved per CODEBASE_PLAN §14.

If any unforeseen issue arises during implementation that changes the plan above, I will pause, open a `plan-amendment` issue per CLAUDE_CODE_PLAN §4.5, and wait for your input before resuming. Per the operating rules.

---

## Approval

This PR contains the **plan only** in this commit. No `frontend/` or `backend/` files have been moved.

**Awaiting Benson's approval to proceed with Steps 1 through 11.**

When you approve, I will execute the steps in order, committing each as a separate Conventional Commit on this branch, then squash-merge into `graft-spray/main` after the verification checklist in §4.11 passes.

If you want any step reordered, removed, or added, comment on the PR and I will revise the plan before any file moves happen.
