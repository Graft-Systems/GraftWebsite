# Graft Systems — Company Website

Marketing website and estimation-tool demo for **Graft Systems**, an agtech startup that uses machine learning to estimate grape cluster weight from vineyard photos.

This repo is a **monorepo** — two projects side by side:

```
graft-website/
├── frontend/    # Next.js 15 + TypeScript — the actual website
└── backend/     # Django 5 + Python — API (contact form, /estimate stub)
```

---

## Who can edit this

| Person | GitHub | Access |
|---|---|---|
| Benson Klein | [@bensontries](https://github.com/bensontries) | Owner |
| Jacob Tkaczyk | [@jacobtkaczyk](https://github.com/jacobtkaczyk) | Write |
| Viraaj Nindra | [@viraajnindra](https://github.com/viraajnindra) | Write |
| Arnav Chittiprolu | [@Arnav-Chittiprolu](https://github.com/Arnav-Chittiprolu) | Write |

Push directly to `main` only for tiny fixes. Any real change → branch + open a pull request.

---

## Stack at a glance

| Layer | Tech | Where to look |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion | [`frontend/`](./frontend/) |
| **Backend** | Django 5, Python 3.12+ | [`backend/`](./backend/) |
| **Email** | Resend (transactional) | Backend → `/api/contact` |
| **Database** | SQLite (dev), Postgres (prod) | Backend |
| **Deploy target** | Vercel (frontend), Render (backend) | [`render.yaml`](./render.yaml) |

How the two talk to each other:

```
Browser  →  Next.js (:3000)  →  /api/*  →  Django (:8080)  →  DB + Resend
```

Next.js rewrites `/api/*` to the Django backend, so the browser sees everything as same-origin. No CORS headaches in dev.

---

## Running it locally

You'll run **two processes** side by side — one for the frontend, one for the backend.

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Python 3.12+** — [python.org](https://python.org/)
- **Git**

### Clone

```bash
git clone https://github.com/Graft-Systems/GraftWebsite.git
cd GraftWebsite
```

### New contributor fast path

If you're handing this to another engineer or coding agent, start with:

- `backend/PredictionTool/HANDOFF.md`

It is the authoritative "clone to running app" runbook.

### Terminal 1 — backend (Django)

See [`backend/README.md`](./backend/README.md) for full details. Quick version:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then edit .env and add your RESEND_API_KEY
python manage.py migrate
python manage.py runserver 127.0.0.1:8080
```

Backend now running at http://127.0.0.1:8080.

### Terminal 2 — frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

For local uploads on `/tool`, keep both of these in `frontend/.env.local`:

```bash
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080
```

### Submitting the contact form

With both running, go to http://localhost:3000/contact and submit the form.

- Next.js sends it to `/api/contact` (same origin)
- Next.js's rewrite forwards it to Django at `http://127.0.0.1:8080/api/contact`
- Django saves a row in the database
- Django sends the email via Resend (if `RESEND_API_KEY` is set)
- Response bubbles back to the browser

View stored submissions at http://127.0.0.1:8080/admin/ (after you've run `createsuperuser` — see backend README).

---

## Deploying (Vercel + Render)

### 1) Deploy backend on Render

1. In Render, create a new Blueprint and point it at this repo.
2. Render will detect [`render.yaml`](./render.yaml) and create:
   - a web service (`graft-api`)
   - a Postgres database (`graft-db`)
3. In the Render service env vars, set:
   - `DJANGO_ALLOWED_HOSTS` to your actual Render host
   - `CORS_ALLOWED_ORIGINS` to your Vercel production domain(s)
   - `CSRF_TRUSTED_ORIGINS` to your Vercel production domain(s)
   - `RESEND_API_KEY` to your real Resend key
4. Deploy and copy your backend URL, e.g. `https://graft-api.onrender.com`.

### 2) Deploy frontend on Vercel

1. Import this repo in Vercel.
2. Set **Root Directory** to `frontend`.
3. Add env var in Vercel:
   - `BACKEND_URL=https://<your-render-service>.onrender.com`
   - `NEXT_PUBLIC_BACKEND_URL=https://<your-render-service>.onrender.com`
4. Deploy.

### 3) Verify end-to-end

1. Open your Vercel URL.
2. Submit `/contact` form.
3. Confirm response succeeds and new row appears in Django admin on Render.

---

## Pages (frontend)

| Route | Page | What it does |
|---|---|---|
| `/` | Home | Hero, snap-a-photo CTA, ML estimation explainer, bear/base/bull graph, GPS precision, barrel benefits, footer CTA |
| `/about` | About | Timeline, team bios, contact CTA |
| `/contact` | Contact | Contact form → submits to backend |
| `/tool` | Tool | Upload cluster photos, run ML estimates, and view saved prediction history |

## API endpoints (backend)

Hosted on Django at `/api/*`. The frontend reaches them via Next.js's rewrite, so from the browser you can still just hit `/api/contact` etc.

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/contact` | `{name, email, message}` | `{ok: true, id, email_status}` |
| `POST` | `/api/estimate` | multipart `files`, optional `batch_id` | `{results: [...], batch_id, summary: {processed, model}}` |
| `GET` | `/api/estimate/history?limit=10` | query `limit` (1-50) | `{batches: [...], summary: {count, limit}}` |
| `DELETE` | `/api/estimate/history/<batch_id>` | none | `{ok: true, id}` |

Full docs in [`backend/README.md`](./backend/README.md).

Current upload inference policy:

- Uploaded-image prediction does not use CSV filename enrichment.
- Upload responses do not include `ground_truth_weight` or `absolute_error`.

---

## How to make a change

1. Pull the latest:
   ```bash
   git pull origin main
   ```
2. Make a branch:
   ```bash
   git checkout -b your-name/short-description
   ```
3. Edit. If you're touching frontend, `npm run dev`. If backend, `python manage.py runserver 127.0.0.1:8080`. If both, two terminals.
4. Commit:
   ```bash
   git add .
   git commit -m "what changed and why"
   ```
5. Push:
   ```bash
   git push -u origin your-name/short-description
   ```
6. Open a pull request on GitHub. Benson reviews and merges.

---

## Common commands

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | Check code |

### Backend

| Command | What it does |
|---|---|
| `python manage.py runserver 127.0.0.1:8080` | Dev server |
| `python manage.py migrate` | Apply database migrations |
| `python manage.py makemigrations api` | Create new migrations after changing models |
| `python manage.py createsuperuser` | Make an admin user for `/admin/` |
| `python manage.py shell` | Open a Python REPL with Django loaded |

---

## Contact

graftsystems@gmail.com
