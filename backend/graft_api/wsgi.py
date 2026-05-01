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
# Try to warm the prediction runtime in a background thread so the first
# request doesn't block while torch downloads/initializes the CNN. This is a
# best-effort, non-fatal optimization for deployments where the model cache
# may not have been pre-populated at build time.
try:
	import threading
	import logging

	log = logging.getLogger(__name__)

	def _warm_prediction_runtime():
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
