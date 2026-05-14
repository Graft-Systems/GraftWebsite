"""
Django settings for the Graft Systems API.
"""

import os
import sys
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")
# Local monorepo dev: Next reads `apps/web/.env.local`; Django does not unless
# we load it here. `override=False` keeps `services/api/.env` as the source of
# truth when the same key exists in both files.
_monorepo_root = BASE_DIR.parent.parent
_web_env_local = _monorepo_root / "apps" / "web" / ".env.local"
if _web_env_local.is_file():
    load_dotenv(_web_env_local, override=False)


def _env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "y", "on"}


SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-replace-me-in-production",
)

DEBUG = _env_bool("DJANGO_DEBUG", False)

ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Render provides the public hostname automatically.
render_external_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)

CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS", "")


INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # M0-03: PostGIS spatial fields require django.contrib.gis. Postgres is
    # now the only supported database for the spray app; the legacy `api`
    # app continues to work because gis is additive.
    "django.contrib.gis",
    "corsheaders",
    "rest_framework",
    "api",
    "spray",
]

# DRF config for the Spray app. The existing `api` app uses plain Django
# views and is unaffected; only `spray` views opt into DRF.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "spray.auth.clerk.ClerkJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "UNAUTHENTICATED_USER": None,
}

# Clerk configuration. Values come from environment variables (Render
# secret store in prod, .env in dev). All optional at app-load time so
# the service still boots without Clerk configured; the auth and webhook
# code paths raise a clear error if a Clerk request lands without config.
CLERK_PUBLISHABLE_KEY = os.environ.get("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_WEBHOOK_SIGNING_SECRET = os.environ.get("CLERK_WEBHOOK_SIGNING_SECRET", "")
CLERK_FRONTEND_API = os.environ.get("CLERK_FRONTEND_API", "")
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
# When True, a verified Clerk JWT can create a local User if the Clerk webhook
# has not run yet (typical local dev without ngrok). Requires an `email` claim
# in the session JWT (Clerk → Configure → Sessions → Customize session token).
# Default off so production and tests stay webhook-authoritative unless enabled.
CLERK_JIT_USER_PROVISIONING = _env_bool("CLERK_JIT_USER_PROVISIONING", False)

# M0-06: Visual Crossing weather provider. Free tier covers M0; the
# adapter raises ProviderAuthError if unset, which the worker logs and
# moves on (no row written, retry on next beat tick).
VISUAL_CROSSING_API_KEY = os.environ.get("VISUAL_CROSSING_API_KEY", "")

# M1.5 PR-D: sensor-connector credential encryption (Fernet) + Pessl
# FieldClimate OAuth 2.0 partner-app credentials. Generate the Fernet key
# via:
#     python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Tests override this via `override_settings` with a throwaway key; the
# production key MUST NOT be committed to the repo or used in tests.
SPRAY_INTEGRATION_FERNET_KEY = os.environ.get("SPRAY_INTEGRATION_FERNET_KEY", "")
PESSL_CLIENT_ID = os.environ.get("PESSL_CLIENT_ID", "")
PESSL_CLIENT_SECRET = os.environ.get("PESSL_CLIENT_SECRET", "")
PESSL_REDIRECT_URI = os.environ.get(
    "PESSL_REDIRECT_URI",
    "https://api.graft-systems.app/api/spray/integrations/pessl/oauth/callback",
)
PESSL_API_BASE = os.environ.get(
    "PESSL_API_BASE", "https://api.fieldclimate.com/v2"
)
# Frontend origin used for OAuth callback redirects (set in Render env).
SPRAY_FRONTEND_BASE_URL = os.environ.get("SPRAY_FRONTEND_BASE_URL", "")
# API origin surfaced in PR-E's METER webhook reveal flow so the user
# can paste a complete webhook URL into METER ZENTRA Cloud.
SPRAY_API_BASE_URL = os.environ.get(
    "SPRAY_API_BASE_URL", "https://api.graft-systems.app"
)
# M1.5 PR-E: Davis WeatherLink + METER ZENTRA Cloud bases (env-overridable
# so dev/CI can point at fixtures or a staging gateway).
DAVIS_API_BASE = os.environ.get(
    "DAVIS_API_BASE", "https://api.weatherlink.com/v2"
)
METER_API_BASE = os.environ.get(
    "METER_API_BASE", "https://zentracloud.com/api/v4"
)

# M1.5 PR-F.5: LLM-authored daily brief. The orchestrator falls back to
# the deterministic-template renderer when ANTHROPIC_API_KEY is unset,
# so this is safe to leave empty in dev/CI.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
LLM_BRIEF_ENABLED = os.environ.get("LLM_BRIEF_ENABLED", "true").lower() == "true"
LLM_BRIEF_MODEL = os.environ.get("LLM_BRIEF_MODEL", "claude-sonnet-4-5-20251022")
LLM_BRIEF_TIMEOUT_SEC = int(os.environ.get("LLM_BRIEF_TIMEOUT_SEC", "10"))

# M1-09: Imagery bucket (separate from M0-04's data-lake bucket so
# retention rules + KMS-CMK swaps can diverge per spec §17.1).
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
IMAGERY_BUCKET = os.environ.get("IMAGERY_BUCKET", "graft-spray-imagery-dev")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # M0-03: sets app.current_org_id GUC per request so RLS policies can
    # filter rows by tenant. Must come AFTER auth middleware so request.user
    # is resolved.
    "spray.middleware.CurrentOrgMiddleware",
]

ROOT_URLCONF = "graft_api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "graft_api.wsgi.application"


# Database — Postgres + PostGIS, always. M0-03 dropped SQLite because the
# spray app uses spatial fields (`Vineyard.centroid`, `Block.geom`) that
# require PostGIS. Local dev uses the docker-compose Postgres in
# `infra/dev/`; CI uses a postgres+postgis service container; prod is
# Render Postgres Pro.
#
# DATABASE_URL takes precedence; the local default points at the docker
# compose service so `python manage.py runserver` works out of the box
# after `docker compose up -d`.
DATABASES = {
    "default": dj_database_url.config(
        default="postgis://graft:graft@localhost:5432/graft_spray",
        conn_max_age=600,
        conn_health_checks=True,
        engine="django.contrib.gis.db.backends.postgis",
    )
}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files — WhiteNoise serves admin CSS/JS in production.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# django-jazzmin — https://django-jazzmin.readthedocs.io/
JAZZMIN_SETTINGS = {
    "site_title": "Graft API Admin",
    "site_header": "Graft Systems",
    "site_brand": "Graft",
    "welcome_sign": "Staff admin — Spray, predictions, and marketing data",
    "copyright": "Graft Systems",
    "search_model": ["spray.User", "spray.Org", "api.ContactSubmission"],
    "show_sidebar": True,
    "navigation_expanded": False,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": ["spray", "api", "auth", "contenttypes"],
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "dark_mode_theme": "darkly",
    "navbar_small_text": False,
    "footer_small_text": True,
    "body_small_text": False,
    "brand_small_text": False,
    "accent": "accent-primary",
}


# CORS — allow the frontend origin(s) to call this API.
CORS_ALLOWED_ORIGINS = _env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000",
)
CORS_ALLOWED_ORIGIN_REGEXES = _env_list("CORS_ALLOWED_ORIGIN_REGEXES", "")
CORS_ALLOW_CREDENTIALS = False


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}


# Email (Resend).
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
CONTACT_TO_EMAIL = os.environ.get("CONTACT_TO_EMAIL", "graftsystems@gmail.com")
CONTACT_FROM_EMAIL = os.environ.get(
    "CONTACT_FROM_EMAIL",
    "Graft Systems Site <onboarding@resend.dev>",
)

# Prediction Tool integration.
PREDICTION_TOOL_ROOT = os.environ.get(
    "PREDICTION_TOOL_ROOT",
    str(BASE_DIR / "PredictionTool"),
)
PREDICTION_TRAIN_DIR = os.environ.get(
    "PREDICTION_TRAIN_DIR",
    str(Path(PREDICTION_TOOL_ROOT) / "data" / "raw"),
)
_default_prediction_csv = str(Path(PREDICTION_TRAIN_DIR) / "Ground Truth for Dataset 4.csv")
PREDICTION_TRAIN_CSV = os.environ.get("PREDICTION_TRAIN_CSV", _default_prediction_csv)
PREDICTION_GT_CSV = os.environ.get("PREDICTION_GT_CSV", PREDICTION_TRAIN_CSV)
PREDICTION_MODEL_PATH = os.environ.get("PREDICTION_MODEL_PATH", "")
PREDICTION_RUNS_DIR = os.environ.get(
    "PREDICTION_RUNS_DIR",
    str(Path(PREDICTION_TOOL_ROOT) / "backend" / "runs"),
)
PREDICTION_RANDOM_STATE = int(os.environ.get("PREDICTION_RANDOM_STATE", "42"))
PREDICTION_VAL_FRACTION = float(os.environ.get("PREDICTION_VAL_FRACTION", "0.2"))
PREDICTION_USE_RAW_DEPTH = _env_bool("PREDICTION_USE_RAW_DEPTH", True)
PREDICTION_BACKBONE = os.environ.get("PREDICTION_BACKBONE", "hand").strip().lower()

# ───── PostGIS / GDAL Configuration ─────
if sys.platform == "darwin":
    GDAL_LIBRARY_PATH = "/opt/homebrew/opt/gdal/lib/libgdal.dylib"
    GEOS_LIBRARY_PATH = "/opt/homebrew/opt/geos/lib/libgeos_c.dylib"

# ───── Production hardening ─────
# HSTS / proxy / framing only when DEBUG=False. HTTPS redirect and secure
# cookies stay off during DEBUG *and* under pytest so APIClient never
# receives 301 → https://testserver/... (CI sets DJANGO_DEBUG=True, but
# a stray .env or subprocess can still leave DEBUG=False).
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 days; bump later once confident
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"

_test_client_safe = DEBUG or ("pytest" in sys.modules)
SECURE_SSL_REDIRECT = (not _test_client_safe) and _env_bool(
    "DJANGO_SECURE_SSL_REDIRECT", True
)
SESSION_COOKIE_SECURE = not _test_client_safe
CSRF_COOKIE_SECURE = not _test_client_safe
