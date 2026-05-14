# Credentials + Environment Variables

Every secret + env var the system reads, where it's used, and how to get one.

## How env loading works

- **Local dev** - `services/api/.env` (gitignored). Loaded by `python-dotenv` in `graft_api/settings.py`.
- **Render API + Worker** - Render dashboard → service → Environment tab. Both services need most of the same vars; some are API-only (Anthropic, Imagery) and some are Worker-only (Celery broker URL points at the same Redis).
- **Vercel** - Dashboard → Project → Settings → Environment Variables. Set per environment (Production / Preview / Development). Frontend reads only the `NEXT_PUBLIC_*` prefixed Clerk vars.

## Credentials Benson already has

These should be in his secrets doc (private Google Doc). Ask him to share them with you securely - do NOT paste into chat or commit.

| Var | Owner | Used by | How obtained |
|---|---|---|---|
| `CLERK_SECRET_KEY` | Benson | API + Vercel | Clerk dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | Benson | Vercel only (NEXT_PUBLIC_) | Same |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Benson | API only | Clerk dashboard → Webhooks → endpoint detail |
| `CLERK_FRONTEND_API` | Benson | API only | Clerk dashboard → Instance Configuration |
| `CLERK_JWKS_URL` | Benson | API only | `https://<frontend-api>/.well-known/jwks.json` |
| `VISUAL_CROSSING_API_KEY` | Benson | API + Worker | https://visualcrossing.com (free tier, 1k records/day) |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Benson | API + Worker | AWS IAM user `graft-spray-worker` (bucket-scoped) |
| `LAKE_BUCKET=graft-spray-lake-dev` | Benson | Worker | n/a |
| `IMAGERY_BUCKET=graft-spray-imagery-dev` | Benson | API | n/a |
| `ANTHROPIC_API_KEY` | Benson (just provisioned 2026-05-08) | API only | https://console.anthropic.com → API Keys |
| `DJANGO_SECRET_KEY` | Benson | API only | Generated via `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | Render-injected | API + Worker | Set automatically by Render Postgres linkage |
| `CELERY_BROKER_URL` + `CELERY_RESULT_BACKEND` | Render-injected | Worker | Set automatically by Render Redis linkage |

## Credentials NOT yet provisioned

These the next dev will need to get or wait for:

| Var | Status | Action |
|---|---|---|
| `SPRAY_INTEGRATION_FERNET_KEY` | not yet generated | Run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` then paste into Render API + Worker env. WITHOUT this, every encrypted-token operation fails (Pessl OAuth, Davis paste-key, METER paste-token). |
| `PESSL_CLIENT_ID` + `PESSL_CLIENT_SECRET` | awaiting Pessl partner-app approval | Email api@metos.at + support@fieldclimate.com requesting OAuth partner credentials for Graft Spray. Manual review, can take days. Redirect URI to register: `https://graftwebsite.onrender.com/api/spray/integrations/pessl/oauth/callback`. |
| `PESSL_REDIRECT_URI` | once partner app exists | Set to the URI registered with Pessl. |
| Davis test account | Benson has one (Basic plan) | His credentials in his secrets doc. Basic is enough for live polling; Pro/Pro+ required for historical backfill. |
| METER ZENTRA test account | Benson has one | His bearer token in his secrets doc. |

## Defaults baked into settings.py (do not set in prod unless overriding)

```
PESSL_API_BASE = "https://api.fieldclimate.com/v2"
DAVIS_API_BASE = "https://api.weatherlink.com/v2"
METER_API_BASE = "https://zentracloud.com/api/v4"
SPRAY_FRONTEND_BASE_URL = ""  # set this in Render env to the Vercel prod URL so OAuth callback redirects work
SPRAY_API_BASE_URL = "https://api.graft-systems.app"  # surfaced in METER webhook reveal modal
LLM_BRIEF_ENABLED = true
LLM_BRIEF_MODEL = "claude-sonnet-4-5-20251022"
LLM_BRIEF_TIMEOUT_SEC = 10
GRAFT_SPRAY_PESSL_CADENCE_SEC = 900    # 15 min
GRAFT_SPRAY_DAVIS_CADENCE_SEC = 900    # 15 min
GRAFT_SPRAY_METER_CADENCE_SEC = 3600   # 60 min (push handles real-time)
GRAFT_SPRAY_AGGREGATION_CADENCE_SEC = 3600  # 1h
```

## Vercel environment variables

Frontend needs:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk>
CLERK_SECRET_KEY=<from Clerk>  # used by Next middleware for server-side auth checks
BACKEND_URL=https://graftwebsite.onrender.com  # used by Next rewrites in next.config.js
```

Set across Production / Preview / Development. Preview deploys (PR previews) reuse Production values by default unless overridden.

## Where the spec says more

- Spec §17.1 - data classification + secret handling (KMS rotation deferred to post-MVP).
- Spec §20.4 - credential rotation runbook (also post-MVP).
- Spec §16.1 - Render service inventory (the manual prereq for M0-03 Postgres Pro upgrade).
