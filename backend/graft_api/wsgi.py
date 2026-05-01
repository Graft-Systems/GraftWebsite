"""
WSGI config for graft_api project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'graft_api.settings')

application = get_wsgi_application()


def _env_bool(name: str, default: bool = False) -> bool:
	raw = os.environ.get(name)
	if raw is None:
		return default
	return raw.lower() in {"1", "true", "yes", "y", "on"}


# Optional warm-up for the heavy v2 model runtime. Keep it disabled by default
# on small instances to avoid startup OOM/restart loops.
if _env_bool("PREDICTION_WARM_ON_STARTUP", False):
	try:
		import logging
		import threading

		log = logging.getLogger(__name__)

		def _warm_prediction_runtime() -> None:
			try:
				# Import locally to avoid import-time side-effects when Django
				# management commands run (e.g., migrations).
				from api import prediction_tool_adapter

				prediction_tool_adapter._load_v2_runtime()
				log.info("Prediction runtime warmed successfully")
			except Exception as exc:  # pragma: no cover - runtime-only
				log.exception("Prediction runtime warm failed: %s", exc)

		t = threading.Thread(target=_warm_prediction_runtime, daemon=True)
		t.start()
	except Exception:
		# Don't let any warming failures prevent the app from starting.
		pass
