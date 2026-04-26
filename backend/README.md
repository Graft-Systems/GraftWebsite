# Graft API — Django backend

Python/Django backend for the Graft Systems website. Serves two endpoints used by the Next.js frontend.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/` | Healthcheck — returns `{ok: true, service: "graft-api"}` |
| `GET` | `/admin/` | Django admin panel (view contact submissions, manage users) |
| `POST` | `/api/contact` | Saves a contact form submission to the database and sends an email via Resend |
| `POST` | `/api/estimate` | Runs ML inference, appends results to an optional active batch (`batch_id`), returns `batch_id` + batch summary |
| `GET` | `/api/estimate/history?limit=10` | Returns recent saved prediction batches (most recent first) |
| `DELETE` | `/api/estimate/history/<batch_id>` | Permanently deletes a saved prediction batch and all nested predictions |

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

# Estimate (multipart upload, new batch)
curl -X POST http://127.0.0.1:8080/api/estimate \
  -F "files=@/path/to/cluster-a.jpg"
# → {"results":[{"filename":"...","prediction_weight":...,"image_url":"/media/prediction_uploads/..."}], "batch_id": 12, "summary":{"processed":1,"model":"..."}}

# Estimate (append to active batch)
curl -X POST http://127.0.0.1:8080/api/estimate \
  -F "batch_id=12" \
  -F "files=@/path/to/cluster-b.jpg"
# → {"results":[...], "batch_id": 12, "summary":{"processed":2,"model":"..."}}

# Estimate history
curl "http://127.0.0.1:8080/api/estimate/history?limit=5"
# → {"batches":[...], "summary":{"count":5,"limit":5}}

# Delete a batch (hard delete)
curl -X DELETE "http://127.0.0.1:8080/api/estimate/history/12"
# → {"ok": true, "id": 12}
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

## Prediction history persistence

Every successful `/api/estimate` request is saved as:
- `PredictionBatch` (one row per upload request)
- `PredictionResult` (one row per uploaded image, linked to the batch)

Use `/api/estimate/history` to read recent saved batches.
Prediction results now include `image_url` when an uploaded image was stored.

## Inference CSV enrichment

Uploaded images are always treated as unseen inference-only inputs.
`/api/estimate` does not use filename-based CSV lookup for tabular features or ground-truth labels.

## Deploying to Render

This repo includes a root-level `render.yaml` Blueprint that provisions:
- a Python web service for this backend (`graft-api`)
- a Postgres database (`graft-db`)

### Deploy steps

1. In Render, choose **New +** → **Blueprint** and connect this repository.
2. Render will detect `render.yaml` and create both resources.
3. In the web service env vars, set real values for:
  - `DJANGO_ALLOWED_HOSTS` (your Render hostname)
  - `CORS_ALLOWED_ORIGINS` (your Vercel production origin)
  - `CSRF_TRUSTED_ORIGINS` (your Vercel production origin)
  - `RESEND_API_KEY` (from resend.com)
4. Deploy. Render runs migrations and collectstatic during startup.
5. Copy your Render backend URL and set `BACKEND_URL` in Vercel frontend env vars.

### Post-deploy checks

1. Open `https://<your-render-service>.onrender.com/` and confirm `{ok: true}`.
2. Post to `/api/contact` from your Vercel frontend and confirm success.
