# Graft Systems Monorepo

Marketing website, estimation-tool demo, and the Graft Spray application (under construction), all in one [pnpm](https://pnpm.io) + [Turborepo](https://turbo.build) monorepo.

## Repo layout

```
.
├── apps/
│   └── web/                      # Next.js 15 — marketing site + Spray app shell (M0+)
├── services/
│   └── api/                      # Django 5 — REST API (deployed to Render)
│       └── PredictionTool/       # git submodule: grape-weight ML model
├── packages/
│   ├── ui/                       # Shared UI primitives + design tokens (M0-02+)
│   ├── client-core/              # OpenAPI-generated TS client + hooks (M0-04+)
│   ├── eslint-config/            # Shared ESLint flat configs (nextjs / react-native / node)
│   └── tsconfig/                 # Shared TypeScript base configs
├── docs/
│   ├── spec/
│   │   ├── Graft-Spray-App-Spec.pdf      # 73-page application specification
│   │   ├── Graft-Spray-App-Spec.md       # Source markdown
│   │   ├── CODEBASE_PLAN.md              # Whole-codebase plan, risks, open questions
│   │   ├── CLAUDE_CODE_PLAN.md           # Operating manual for the implementing agent
│   │   ├── _plans/                       # Per-milestone PR plans (M0-01, M0-02, ...)
│   │   ├── _source/                      # Original spec brief + reproducible PDF builder
│   │   └── diagrams/                     # 7 Mermaid sources + rendered PNGs
│   ├── research/                         # The Graft Spray "living brain" (read-only)
│   └── runbooks/                         # Operational runbooks (rollback, incident)
├── frontend-cinematic/                   # Old experimental frontend (untouched, kept for reference)
├── infra/
│   ├── terraform/                        # IaC placeholder (M0-04+)
│   └── docker/                           # Local dev compose (M0-04+)
├── .github/workflows/                    # CI
├── render.yaml                           # Backend deploy (Render)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json                          # Root workspace manifest
```

## What lives where

| Component | Path | Tech | Deploy |
|---|---|---|---|
| Marketing site + Spray app | `apps/web` | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, MapLibre | Vercel |
| Django REST API | `services/api` | Django 5, Python 3.13, DRF, PostGIS (M0-03+) | Render Pro |
| Email | (configured in `services/api`) | Resend | n/a |
| Database | `services/api` | SQLite (dev), PostgreSQL with PostGIS (prod) | Render |

## Who can edit this

| Person | GitHub | Access |
|---|---|---|
| Benson Klein | [@bensontries](https://github.com/bensontries) | Owner |
| Jacob Tkaczyk | [@jacobtkaczyk](https://github.com/jacobtkaczyk) | Write |
| Viraaj Nindra | [@viraajnindra](https://github.com/viraajnindra) | Write |
| Arnav Chittiprolu | [@Arnav-Chittiprolu](https://github.com/Arnav-Chittiprolu) | Write |

For all changes, branch + open a pull request. See [CONTRIBUTING.md](./CONTRIBUTING.md). For Graft Spray work specifically, also read [`docs/spec/CLAUDE_CODE_PLAN.md`](./docs/spec/CLAUDE_CODE_PLAN.md).

## Running it locally

You'll run two processes side by side: the Next.js dev server and the Django dev server.

### Prerequisites

- Node.js 20+
- pnpm 11+ — enable Corepack (`corepack enable`) so the version in root `package.json` (`packageManager`) is used; avoids mismatches with a global install
- Python 3.13+
- Git (with submodule support)

### One-time setup

```bash
git clone --recursive https://github.com/Graft-Systems/GraftWebsite.git
cd GraftWebsite

# Install all workspace dependencies in one shot
pnpm install
```

If you cloned without `--recursive`, run `git submodule update --init --recursive` afterward.

### Terminal 1: Django backend

```bash
cd services/api
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env       # then edit .env (RESEND_API_KEY, etc.)
python manage.py migrate
python manage.py runserver 127.0.0.1:8080
```

Backend now running at http://127.0.0.1:8080.

### Terminal 2: Next.js frontend

From the repo root:

```bash
pnpm --filter @graft/web dev
```

Or from `apps/web/`:

```bash
cd apps/web
cp .env.local.example .env.local        # then edit .env.local
pnpm dev
```

Open http://localhost:3000.

For local uploads on `/tool`, your `apps/web/.env.local` should contain:

```bash
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080
```

### Cross-cutting commands (Turbo)

From the repo root:

```bash
pnpm build           # turbo run build  (every workspace)
pnpm lint            # turbo run lint
pnpm test            # turbo run test
pnpm type-check      # turbo run type-check
pnpm format          # prettier --write
```

## Deploying

### Backend (Render, `services/api`)

`render.yaml` is the source of truth. `rootDir: services/api`. Push to `graft-spray/main` (or `main` for marketing-only changes after a milestone closeout) and Render auto-deploys. See [`render.yaml`](./render.yaml) for the full config.

### Frontend (Vercel, `apps/web`)

Vercel project Root Directory: `apps/web`. (Changed from `frontend` as part of M0-01 monorepo bootstrap.) Required env vars in Vercel: `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`. Vercel auto-deploys on push.

If a deploy fails after a future restructure, see [`docs/runbooks/m0-01-rollback.md`](./docs/runbooks/m0-01-rollback.md) for the rollback path.

## Pages

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Marketing hero, snap-a-photo CTA, ML estimation explainer, GPS precision, footer CTA |
| `/about` | About | Timeline, team bios, contact CTA |
| `/contact` | Contact | Contact form → `/api/contact` |
| `/tool` | Tool | Upload cluster photos for grape-weight estimation; saved prediction history |
| `/spray` | (M0-02a) | Graft Spray marketing landing |
| `/spray/dashboard` | (M0-02a) | Authenticated Spray app shell |

## API endpoints

Hosted by Django at `/api/*`. Next.js rewrites `/api/*` to the backend so the browser sees same-origin.

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/contact` | `{name, email, message}` | `{ok, id, email_status}` |
| `POST` | `/api/estimate` | multipart `files`, optional `batch_id` | `{results, batch_id, summary}` |
| `GET` | `/api/estimate/history?limit=10` | query `limit` (1-50) | `{batches, summary}` |
| `DELETE` | `/api/estimate/history/<batch_id>` | none | `{ok, id}` |
| `POST` | `/api/waitlist` | `{email, source}` | `{ok, id}` |

`/api/spray/*` endpoints land per the milestone plan in [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md) section 6.

Full API docs: [`services/api/README.md`](./services/api/README.md).

## Graft Spray (M0+)

The Graft Spray application is being built in this monorepo on the `graft-spray/main` integration branch. Every Spray PR begins with a written plan (per [`docs/spec/CLAUDE_CODE_PLAN.md`](./docs/spec/CLAUDE_CODE_PLAN.md) section 4). PR target: `graft-spray/main`. Merge to `main` only at milestone closeouts (M1 web MVP launch, M2 iOS launch, etc.).

Authoritative documents:

- **Specification** — [`docs/spec/Graft-Spray-App-Spec.pdf`](./docs/spec/Graft-Spray-App-Spec.pdf) (73 pages).
- **Codebase plan** — [`docs/spec/CODEBASE_PLAN.md`](./docs/spec/CODEBASE_PLAN.md). Risk register, open questions, target tree.
- **Operating manual** — [`docs/spec/CLAUDE_CODE_PLAN.md`](./docs/spec/CLAUDE_CODE_PLAN.md). Read before starting any task.
- **Per-milestone plans** — [`docs/spec/_plans/`](./docs/spec/_plans/).
- **Research dossier** — [`docs/research/`](./docs/research/) (read-only context).
- **Changelog** — [`CHANGELOG.md`](./CHANGELOG.md).

## Contact

graftsystems@gmail.com
