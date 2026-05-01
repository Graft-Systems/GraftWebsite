# Changelog

All notable changes to the Graft Systems monorepo are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with milestone-grouped entries reflecting the Graft Spray roadmap defined in [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md) section 6.

## Unreleased

### M0-01: Monorepo bootstrap — IN PROGRESS

PR #5 on `graft-spray/m0/repo-bootstrap`. Migrates the repo to a pnpm + Turborepo monorepo without disturbing existing production deploys.

#### Added

- Workspace scaffolding at the repo root: `package.json` (root manifest), `pnpm-workspace.yaml`, `turbo.json`.
- `.gitattributes` enforcing LF line endings (resolved Open Question Q9) plus Git LFS tracking patterns for `docs/research/assets/*/datasets/**` (Q11; activates when the dataset-import PR introduces actual files).
- `apps/`, `services/`, `packages/`, `infra/`, `.github/workflows/` directory skeleton.
- `docs/runbooks/m0-01-rollback.md` documenting V1 (Vercel) and G1/G2 (git revert) rollback paths plus the `pre-monorepo` tag fallback.
- `packages/ui` skeleton (M0-02 will populate it with shadcn/ui primitives extracted from `apps/web/components/ui/*` and brand design tokens extracted from `apps/web/tailwind.config.ts`).
- `packages/eslint-config` with three subpath exports (`./nextjs`, `./react-native`, `./node`); empty rule sets at M0-01, real rules in M0-02.
- `packages/tsconfig` with `base.json`, `nextjs.json`, `react-native.json`, `node.json`. Strict mode plus `noUncheckedIndexedAccess` baseline.
- `packages/client-core` skeleton; the OpenAPI-generated TypeScript client lands in M0-04 once `services/api/openapi.yaml` stabilizes.
- `.gitmodules` declaring `services/api/PredictionTool` correctly (resolves R1; the file was missing before, breaking fresh `git clone --recursive`).
- `.github/workflows/ci.yml` for lint, type-check, build, test on every PR plus push to `main` and `graft-spray/main`. Lint, type-check, and test currently `continue-on-error` until M0-02 populates real rule sets and test suites; build and `python manage.py check` are hard requirements.
- `CONTRIBUTING.md` documenting the two-track workflow (marketing-site fixes vs. Graft Spray work) plus Conventional Commits, squash-merge, and the no-em-dashes rule.
- This `CHANGELOG.md`.

#### Changed

- `frontend/` moved to `apps/web/` via per-file `git mv` (preserves history; verifiable via `git log --follow`). `apps/web/package.json` `name` field updated to `@graft/web` for the pnpm workspace.
- `backend/` moved to `services/api/` via per-file `git mv` (the directory-level `git mv` failed twice with a Windows file-lock issue at the directory level even after relocating `.venv` and `db.sqlite3`; per-file worked). The `backend/PredictionTool` submodule moves to `services/api/PredictionTool` with its dirty working-tree state intact (resolved Open Question Q2: leave alone).
- `render.yaml` `rootDir` changed from `backend` to `services/api` (activates at merge time when Render picks up the new yaml).
- Root `README.md` rewritten to reflect the monorepo structure while preserving the collaborator table, deploy instructions (with updated paths), and API documentation.
- `.gitignore` extended with monorepo patterns (`.turbo/`, `apps/*/dist/`, `services/*/.venv/`, etc.).

#### Manual step (Benson, at merge time)

- **Vercel root directory**: change from `frontend` to `apps/web` in the Vercel dashboard. Vercel does not redeploy on settings change, so production keeps serving the previous build until the next git push triggers a new deploy. Do this in tandem with the M0-01 squash-merge into `graft-spray/main`. See [`docs/runbooks/m0-01-rollback.md`](./docs/runbooks/m0-01-rollback.md) section V1 if anything goes sideways.

#### Notes

- Three resolved Open Questions affect M0-01 directly: Q1 (`frontend-cinematic/` stays at repo root, untouched), Q2 (submodule untouched), Q9 (`.gitattributes` LF policy), Q11 (Git LFS), Q12 (orphan branches abandoned). Full resolution log in CODEBASE_PLAN.md section 14.
- Empty `backend/` directory shell remains at repo root after the rename due to a residual Windows lock; harmless, removable manually with `rmdir backend` once the lock releases.

### M0-00b: Application Specification (#4)

Full spec PDF (73 pages, 791 KB) plus markdown source plus 7 rendered diagrams plus `CLAUDE_CODE_PLAN.md` operating manual.

### M0-00: Whole-Codebase Plan (#3)

`CODEBASE_PLAN.md` with all 14 sections per the spec brief: repository inventory, target tree, milestone allocation, branch and PR plan, migration plan, environment and secrets, risk register (R1-R20), open questions (Q1-Q14, all resolved or partially resolved as of 2026-04-30), Appendix A spec amendments (SA-1 live external risk-index aggregator).

### M0-00a: Research Dossier (#2)

The Graft Spray "living brain" research dossier under `docs/research/`. 7 brain category files, master index, glossary, full source registry (`sources_master.csv`, 405 sources), `business/competitive-landscape.md` (NOT in chatbot RAG). Asset folder skeleton under `docs/research/assets/<category>/{paywalled,reference}/`. 37 of 47 paywalled queue PDFs retrieved (2 outstanding ILL: Strizyk 1983 and Oh 2000; 1 dropped as ghost citation: Mills 1999 DMCAST).

## Earlier

Pre-Graft-Spray history (pre-`cf68b1b`) lives on `main` at https://github.com/Graft-Systems/GraftWebsite/commits/main and is not catalogued here.
