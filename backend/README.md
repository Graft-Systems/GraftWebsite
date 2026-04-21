# Graft API — Django backend

Python/Django backend for the Graft Systems website. Serves two endpoints used by the Next.js frontend.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/` | Healthcheck — returns `{ok: true, service: "graft-api"}` |
| `GET` | `/admin/` | Django admin panel (view contact submissions, manage users) |
| `POST` | `/api/contact` | Saves a contact form submission to the database and sends an email via Resend |
| `POST` | `/api/estimate` | Returns simulated grape-cluster weight estimates (stub — swap this out for the real ML model when ready) |

## Stack

- Python 3.12+ (tested on 3.14)
- Django 5.2 (plain views, no DRF — simple enough not to need it)
- SQLite for local dev (swap to Postgres for prod)
- `django-cors-headers` for CORS
- `resend` (official Python SDK) for transactional email
- `python-dotenv` for loading `.env`

## First-time setup

### 1. Create virtualenv and install deps

From the `backend/` folder:

```bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in:
- `DJANGO_SECRET_KEY` — generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- `RESEND_API_KEY` — grab from [resend.com/api-keys](https://resend.com/api-keys)
- Everything else — defaults are fine for local dev

**Never commit `.env`.** It's in `.gitignore`.

### 3. Apply migrations

```bash
python manage.py migrate
```

This creates the SQLite DB file at `backend/db.sqlite3` with the schema.

### 4. (Optional) Create an admin user

So you can log into `/admin/` and browse contact submissions:

```bash
python manage.py createsuperuser
```

Follow the prompts. Username/password/email whatever you want.

### 5. Run the server

```bash
python manage.py runserver 127.0.0.1:8080
```

Visit:
- http://127.0.0.1:8080/ — healthcheck
- http://127.0.0.1:8080/admin/ — admin panel (after creating superuser)

## Smoke tests

With the server running:

```bash
# Contact form (success)
curl -X POST http://127.0.0.1:8080/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","message":"hello"}'
# → {"ok": true, "id": 1, "email_status": "sent" | "skipped", ...}

# Contact form (validation error)
curl -X POST http://127.0.0.1:8080/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"not-an-email","message":""}'
# → 400 with per-field `issues` object

# Estimate (JSON)
curl -X POST http://127.0.0.1:8080/api/estimate \
  -H "Content-Type: application/json" \
  -d '{"filenames":["cluster-a.jpg"]}'
# → {"results": [{filename, bear, base, bull, blended, unit, model}]}
```

## Layout

```
backend/
├── manage.py
├── requirements.txt
├── .env                   # (git-ignored) real secrets
├── .env.example           # template (safe to commit)
├── graft_api/             # project (settings, URLs)
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── api/                   # app — our endpoints
    ├── models.py          # ContactSubmission
    ├── views.py           # contact + estimate
    ├── urls.py            # /api/contact + /api/estimate
    ├── admin.py           # admin panel registration
    └── migrations/
```

## Swapping in the real ML model

The `/api/estimate` endpoint is currently a deterministic simulation — it hashes the filename to generate bear/base/bull numbers.

When the real model is ready, replace `_simulate_estimate` in `api/views.py` with a call to your model. The response shape (`filename`, `bear`, `base`, `bull`, `blended`, `unit`, `model`) should stay the same so the frontend doesn't need to change.

## Deploying to Railway (later)

1. Sign up at [railway.app](https://railway.app).
2. New project → Deploy from GitHub → pick `graft-website`, set root to `backend`.
3. Add a Postgres plugin — Railway wires the `DATABASE_URL` env var automatically (you'll need to update `settings.py` to use `dj-database-url` to read it).
4. Add the rest of the env vars from `.env.example` in Railway's dashboard.
5. Set the start command to: `gunicorn graft_api.wsgi` (you'll need to `pip install gunicorn` and add to requirements).
6. Deploy. Copy the Railway URL, and set `BACKEND_URL` on the Vercel deployment of the frontend to point at it.
