# Changelog

All notable changes to the Graft Systems monorepo are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with milestone-grouped entries reflecting the Graft Spray roadmap defined in [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md) section 6.

## Unreleased

### M0-02a: Website Integration (`/spray` nav + app shell) — READY FOR MERGE

PR #9 on `graft-spray/m0/website-integration`. Adds the first-class `/spray` surface to the marketing site per spec §21.

#### Added

- `/spray` marketing landing (public, indexed) with hero, three-bullet value prop, and an auth-aware CTA (`<SprayLandingCTA />`) that flips between sign-up + log-in for visitors and "Open dashboard" for signed-in users.
- `/spray/dashboard` placeholder dashboard, rendered inside the new authenticated app shell.
- `/spray/post-login` server-side router that branches the user based on Org membership: no Org → `/spray/onboarding`, any Org → `/spray/dashboard`. Falls through to onboarding when the API is unreachable so the flow does not dead-end while Render is on the pre-M0-closeout codebase.
- `/spray/onboarding` (existing M0-02 stub, moved from `/onboarding` to its proper URL).
- App shell components in `apps/web/components/spray/`:
  - `SprayShell` — sidebar + topbar + main content area; sidebar nav links to Dashboard, Vineyards, Forecasts, Spray records, Settings (placeholders for routes that land later).
  - `OrgSwitcher` — top-bar dropdown that pulls memberships from `GET /api/spray/orgs/me`; falls back to "Personal" placeholder when the API is unreachable.
  - `SprayLandingCTA` — auth-aware marketing CTA.
- `MarketingChromeGuard` — hides the marketing nav and footer on authenticated `/spray/<deeper>` routes; keeps them on the bare `/spray` landing and all marketing routes.
- "Spray" link added to the marketing nav between "Tool" and "Contact"; the link target deep-links signed-in users straight to `/spray/dashboard`.
- `apps/web/app/sitemap.ts` (Next.js `MetadataRoute.Sitemap`) covering the five marketing routes including `/spray`. Authenticated routes carry `metadata.robots.index = false`.
- Vitest harness: `vitest.config.ts`, `vitest.setup.ts`, three test files (`marketing-chrome-guard.test.tsx`, `nav.test.tsx`, `spray-landing-cta.test.tsx`) — 11 tests, all green.
- `pnpm test` and `pnpm test:watch` scripts in `apps/web/package.json`.

#### Changed

- `<ClerkProvider>` in the root layout now sets `afterSignOutUrl="/spray"` so logout returns the user to the Spray landing page (spec §21.4).
- `apps/web/middleware.ts` protects only the deeper `/spray/<authenticated>` routes; the bare `/spray` landing stays public.
- `/sign-in` and `/sign-up` Clerk pages now redirect to `/spray/post-login` after auth (replaced the M0-02 placeholder of `/onboarding`).
- Old `apps/web/app/(spray)/` parens-group route directory removed; replaced by the real folder `apps/web/app/spray/` containing both the public landing (`page.tsx`) and the `(app)/` route group housing the authenticated shell.

#### Notes

- Lighthouse parity check is a manual step at PR-review time; bundle-size budget enforcement lands in M0-04 alongside `packages/ui`.
- Org switcher placement is top bar center-right (the default from plan §9 question 2).
- Logged-in users visiting `/spray` see the marketing page with a swapped "Open dashboard" CTA, not an auto-redirect (the default from plan §9 question 3) — keeps the URL meaningful and SEO-clean.

### M0-02: Account & Identity (Clerk) — READY FOR MERGE

PR #6 on `graft-spray/m0/auth-identity`. Stands up the foundation of Graft Spray's identity layer: Clerk hosts auth flows for `apps/web`, a new `spray` Django app under `services/api/` owns the multi-tenant data model, Clerk webhooks sync canonical User records, DRF authentication and permission classes enforce the four-role RBAC, and an in-app account-deletion endpoint satisfies Apple App Review Guideline 5.1.1(v).

#### Added

- `services/api/spray/` Django app with six models per spec section 9.1 / section 20: `Org`, `User`, `Membership` (4-role RBAC), `Session`, `AuthEvent` (immutable audit trail, 19 event types), `ConsentRecord` (4 categories per spec section 19.5).
- `services/api/spray/auth/clerk.py` — `ClerkJWTAuthentication` DRF class. Validates `Authorization: Bearer` tokens against Clerk's JWKS via PyJWT + `RSAAlgorithm.from_jwk`. JWKS cached for one hour with single force-refresh on `kid` mismatch. Resolves the local `User` row by `clerk_user_id`.
- `services/api/spray/permissions.py` — five DRF permission classes (`IsAuthenticatedSpray`, `IsOrgViewer`, `IsOrgMember`, `IsOrgAdmin`, `IsOrgOwner`). Org context resolves from `view.kwargs['org_id']`, request body, or `X-Org-Id` header.
- Clerk webhook ingestion at `POST /api/spray/clerk/webhook`. Svix signature validation; dispatches `user.created`, `user.updated`, `user.deleted`, `session.created`, `session.removed`. Idempotent on replay.
- Org and Membership endpoints (spec section 20.4): create / list-mine / get / patch / archive Orgs; list / invite / role-change / remove Memberships. Last-Owner protection on demote and remove paths. Each write emits an `AuthEvent`.
- Account lifecycle endpoints: `POST /api/spray/account/delete` (two-step deletion with `confirm: true`), `POST /api/spray/account/export` (synchronous JSON dump at M0-02; full async + photo-zip lands in M0-04).
- Per-category consent toggles at `POST /api/spray/account/consent` (upsert array of `{category, granted}`); GET endpoint returns the caller's records.
- 66 pytest tests covering models, JWT validation, RBAC matrix, webhook signature + idempotency, every Org endpoint (happy path + denial), account delete (including last-Owner block), and consent toggles. `pytest.ini` wires `DJANGO_SETTINGS_MODULE`.
- `apps/web/middleware.ts` (Clerk middleware protects `/spray/*` and `/onboarding/*`).
- Clerk-hosted `/sign-in` and `/sign-up` pages with the brand amber primary color.
- `<ClerkProvider>` wraps the root layout; `Nav` swaps to `<UserButton>` when signed in (uses `useAuth()` since `SignedIn`/`SignedOut` were dropped in `@clerk/nextjs` v7).
- `apps/web/app/(spray)/onboarding/page.tsx` — minimal stub that renders the four consent toggles and calls the consent endpoint via the user's Clerk JWT. Surfaces non-2xx responses inline (caught the optimistic-UI bug during M0-02 manual E2E).
- `apps/web/.env.example` documenting required Clerk env vars.

#### Changed

- `services/api/graft_api/settings.py` — registers `rest_framework` and `spray` apps, sets `ClerkJWTAuthentication` as the default DRF auth class, surfaces five Clerk env vars (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_FRONTEND_API`, `CLERK_JWKS_URL`).
- `services/api/requirements.txt` — adds `djangorestframework`, `PyJWT`, `cryptography`, `svix`, `pytest`, `pytest-django`.

#### Manual step (Benson, at merge time)

- **Render env vars** (already done 2026-04-30): `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_FRONTEND_API`.
- **Vercel env vars** (already done 2026-04-30): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` across Production / Preview / Development.
- **Vercel `BACKEND_URL`** (deferred to M0 closeout): set to the Render service URL once `graft-spray/main` merges into `main` and the spray endpoints go live on Render.

#### Notes

- Manual E2E verified on Vercel preview `graft-website-git-graft-spray-m0a-...vercel.app`: signup → email verify → onboarding land → sign out → middleware redirect on protected route. Consent roundtrip deferred until M0 closeout deploys the spray app to Render; the 8 consent unit tests cover the backend logic.
- Two resolved Open Questions affect M0-02: Q5 (subpath routing `graftsystems.com/spray/*`), Q8 (Clerk over Auth0). Q14 free-tier resolution holds (Clerk free tier covers 10,000 MAU, sufficient through M2).
- `AuthEvent` rows are insert-only by application convention at M0-02; database-trigger immutability lands in M0-03 alongside row-level security.
- Sign in with Apple deferred to M2 per the dossier decision.

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
