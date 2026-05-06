"""Worker-specific settings (M0-04).

Pulls AWS + lake config from env vars. The shared Django settings
(database, Clerk, etc.) live in services/api/graft_api/settings.py and
are imported transitively when graft_worker.celery does `django.setup()`.
"""

from __future__ import annotations

import os


# AWS / S3
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
LAKE_BUCKET = os.environ.get("LAKE_BUCKET", "graft-spray-lake-dev")

# Forwarding behaviour
LAKE_BATCH_MAX_ROWS = int(os.environ.get("LAKE_BATCH_MAX_ROWS", "1000"))
LAKE_BATCH_WINDOW_SECONDS = int(os.environ.get("LAKE_BATCH_WINDOW_SECONDS", "900"))
