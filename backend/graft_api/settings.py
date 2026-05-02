"""
Django settings for the Graft Systems API.
"""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


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
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "api",
]

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


# Database — Postgres in prod (via DATABASE_URL), SQLite in dev.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
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


# CORS — allow the frontend origin(s) to call this API.
CORS_ALLOWED_ORIGINS = _env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,https://www.graftsystems.com"
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


# ───── Production hardening ─────
# These only activate when DEBUG=False so local dev isn't affected.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = _env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 days; bump later once confident
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
