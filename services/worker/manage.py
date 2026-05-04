#!/usr/bin/env python
"""Worker-side management entrypoint (M0-04).

Bypasses Celery for one-shot operations:

    python services/worker/manage.py forward_now

Useful for ops triage and post-deploy smoke tests.
"""

from __future__ import annotations

import os
import sys

import django


def main() -> int:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "graft_api.settings")

    from pathlib import Path

    api_root = Path(__file__).resolve().parent.parent / "api"
    sys.path.insert(0, str(api_root))

    django.setup()

    if len(sys.argv) < 2:
        print("usage: manage.py <forward_now>")
        return 2

    cmd = sys.argv[1]
    if cmd == "forward_now":
        from graft_worker import lake_writer

        n = lake_writer.forward_pending_events()
        print(f"forwarded {n} events")
        return 0

    print(f"unknown command: {cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
