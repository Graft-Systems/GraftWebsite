# M0-01 Rollback Runbook

If anything breaks after the M0-01 monorepo bootstrap squash-merges into `graft-spray/main` (or worse, propagates to `main`), this runbook restores the pre-migration state.

## Pre-flight checkpoint

The immediate rollback ref is the tag **`pre-monorepo`**, pinned to the tip of `origin/graft-spray/main` at the moment M0-01 work started. Verify it exists before relying on the rollback:

```bash
git fetch origin --tags
git rev-parse pre-monorepo
```

If that returns a SHA, the tag is intact. If it errors, see "Tag missing" below.

## Symptom triage

| Symptom | First-line action |
|---|---|
| Vercel production build fails ("cannot find apps/web") | **Revert Vercel Root Directory** (see step V1 below). Buy time before code revert. |
| Vercel build succeeds but routes 404 | Check that `next.config.mjs` rewrites still target the correct backend URL. Code revert if unclear. |
| Render production build fails ("cannot find services/api") | Code revert + manual check of `render.yaml` rootDir. |
| Render builds but `/api/*` endpoints 500 | Check Django settings + DATABASE_URL connectivity. Render env vars unchanged in M0-01, so this should not happen, but if it does, code revert. |
| pnpm install fails on local clone | Verify Git LFS is installed on the cloning machine (`git lfs version`). |

## V1: Revert Vercel Root Directory (fastest, no git involved)

This is the one-click rollback that buys ~15 minutes to investigate before deciding on a code revert.

1. Open Vercel project: https://vercel.com/dashboard, select the `graftsystems.com` project.
2. Settings, General, Root Directory.
3. Change from `apps/web` back to `frontend`.
4. Save. Vercel does **not** trigger a redeploy on settings change, so production keeps serving the previous (working) build.
5. To force a redeploy with the old root: Deployments tab, find the last known-good deployment (pre-M0-01 merge), click `...`, "Promote to Production".

If V1 stabilizes the symptom, you have time to investigate. If V1 does not help, proceed to G1.

## G1: Git revert on graft-spray/main

```bash
# Identify the merge commit
git log graft-spray/main --oneline -10

# Revert it
git checkout graft-spray/main
git pull
git revert -m 1 <M0-01_squash_merge_sha>
git push origin graft-spray/main
```

`-m 1` selects the first parent (= `graft-spray/main` pre-merge) as the mainline; the revert commit re-introduces all the deleted `frontend/` and `backend/` files.

After the revert lands, Render auto-deploys the reverted code (rootDir back to `backend` per the reverted `render.yaml`).

## G2: Git revert on main (if M0-01 was already promoted to main)

Same procedure as G1 but on `main`:

```bash
git checkout main
git pull
git revert -m 1 <main_promotion_merge_sha>
git push origin main
```

## V2: Reset Render rootDir manually (if render.yaml revert is somehow incomplete)

`render.yaml` is the source of truth for Render. If a revert leaves `render.yaml` in an inconsistent state:

1. Open Render dashboard: https://dashboard.render.com/, select `graft-api` service.
2. Settings, Build & Deploy, "Root Directory" (only if `render.yaml` is NOT the source of truth, which it should be).
3. Change from `services/api` back to `backend`. Save.
4. Manual deploy from Settings, "Manual Deploy" if needed.

## Last resort: hard reset to pre-monorepo tag

If multiple commits have piled up on `graft-spray/main` after M0-01 and reverting individually is messy, you can hard-reset:

```bash
git checkout graft-spray/main
git reset --hard pre-monorepo
git push origin graft-spray/main --force-with-lease
```

**Force pushes to `graft-spray/main` are normally blocked by branch protection.** Lifting branch protection requires an admin (Benson). Only do this if all other options have been exhausted, and notify any other contributors who have branched off the post-M0-01 commits.

## Tag missing

If `pre-monorepo` tag is missing (rotated out, manually deleted), the equivalent commit on `graft-spray/main` is `859c061` (M0-00b spec PDF squash-merge), which is the last commit before any M0-01 work began. Re-tag:

```bash
git tag pre-monorepo 859c061
git push origin pre-monorepo
```

## After rollback: post-mortem

1. File a `m0-01-rollback-postmortem` issue in the repo.
2. Document the symptom, the rollback path used, the root cause, and proposed mitigations.
3. The next attempt at M0-01 incorporates the mitigations into the plan at `docs/spec/_plans/M0-01-plan.md` before any new file moves.

## Contacts

- Benson Klein (repo owner): bensonjklein@gmail.com / `bensontries` on GitHub.
- Render support: https://render.com/support
- Vercel support: https://vercel.com/help

This runbook is kept current with every change to M0-01 scope.
