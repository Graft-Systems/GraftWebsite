# Swapping production from `frontend/` → `frontend-cinematic/`

Goal: if we love the cinematic build and want to ship it as the real site, the cutover is a one-setting change in Vercel. This doc lists everything that stays the same and the handful of things to flip.

---

## What's already identical (no change needed)

| Concern | Status |
|---|---|
| **Backend (Django)** | Untouched. Same API routes, same deployment. |
| **API contract** | `/api/contact`, `/api/estimate` — same endpoints, same payloads. |
| **Next.js rewrite** | `/api/:path*` → `${BACKEND_URL}/api/:path*`. Identical config. |
| **Env var names** | `BACKEND_URL` (+ any future ones) — same names in both frontends. |
| **Build commands** | `npm install` / `npm run build` / `npm run start`. |
| **Node version** | Node 18+. Same as `frontend/`. |
| **Contact form** | Same Resend integration via Django. No change. |

Result: the entire backend, email pipeline, and DB stay in place. The swap is a pure frontend root-directory change.

---

## Option A — In-place swap (recommended when you're ready to cut over)

On **Vercel → your Graft project → Settings → General**:

1. **Root Directory** — change from `frontend` to `frontend-cinematic`
2. **Framework Preset** — Next.js (no change)
3. **Build Command** — leave as default (`next build`)
4. **Install Command** — leave as default
5. **Environment Variables** — no change; variable names match

Then: Deployments → Redeploy (latest on `main` after merging `cinematic-frontend` → `main`).

**Rollback**: change Root Directory back to `frontend` and redeploy. No data migration needed.

---

## Option B — Preview side-by-side (recommended during review)

Keep both frontends live on separate Vercel projects, different URLs, so you can compare:

1. Create a **new Vercel project** from the same `bensontries/graft-website` repo.
2. Set its Root Directory to `frontend-cinematic`.
3. Set the production branch to `cinematic-frontend` (so merges to `main` don't auto-deploy it until you're ready).
4. Copy env vars from the existing project (`BACKEND_URL`, etc.).
5. Give it a distinct domain — e.g. `cinematic.graft.systems` or a free `graft-cinematic.vercel.app`.

When you decide: either point the main domain at this new project, or do Option A and delete this one.

---

## Gotchas / things to double-check before cutover

- **Static assets** — images/videos referenced in `frontend/public/` need to be copied (or re-sourced) into `frontend-cinematic/public/`. There's no auto-share.
- **Attached assets** — `frontend/public/attached_assets/` is currently used by the live site. Copy what's still needed into `frontend-cinematic/public/`.
- **`next-themes` / dark mode** — not currently installed in cinematic; add if we want theming.
- **Analytics / tracking** — whatever the live frontend has (GA, Plausible, Vercel Analytics), mirror it here before swap.
- **Metadata & OG images** — recreate in `frontend-cinematic/app/layout.tsx` and any per-page metadata.
- **Redirects** — if `frontend/` has any `next.config.mjs` redirects beyond the API rewrite, port them over.
- **Sitemap / robots.txt** — port over if present.

A "pre-cutover checklist" will be added to this doc as we build.

---

## If we instead decide to *replace* `frontend/` entirely

Cleanest long-term: once cinematic is the winner, rename. On a new branch:

```bash
git mv frontend frontend-legacy   # or git rm -r frontend if we're done with it
git mv frontend-cinematic frontend
```

Update Vercel Root Directory back to `frontend`. Done. The directory rename is the official cutover.
