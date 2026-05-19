"""Serve uploaded media in production when files live on local disk (USE_S3=false).

Django's static() helper only mounts MEDIA in DEBUG. The Next.js site proxies
``/media/*`` to this API, so we expose a guarded file route for prediction and
newsroom uploads.
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpRequest

# Only user-facing upload prefixes; block path traversal and arbitrary reads.
_ALLOWED_PREFIXES = ("prediction_uploads/", "news_uploads/")


def serve_media(request: HttpRequest, path: str) -> FileResponse:
    if getattr(settings, "USE_S3", False):
        raise Http404("Media is served from object storage.")

    normalized = path.replace("\\", "/").lstrip("/")
    if not normalized or ".." in normalized.split("/"):
        raise Http404("Invalid media path.")

    if not any(normalized.startswith(prefix) for prefix in _ALLOWED_PREFIXES):
        raise Http404("Media path not allowed.")

    media_root = Path(settings.MEDIA_ROOT).resolve()
    target = (media_root / normalized).resolve()

    if media_root not in target.parents and target != media_root:
        raise Http404("Invalid media path.")

    if not target.is_file():
        raise Http404("Media file not found.")

    content_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(
        target.open("rb"),
        content_type=content_type or "application/octet-stream",
    )
