from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from graft_api.media_views import serve_media


def healthcheck(_request):
    return JsonResponse({"ok": True, "service": "graft-api"})


urlpatterns = [
    path("", healthcheck),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/spray/", include("spray.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        path("media/<path:path>", serve_media, name="serve_media"),
    ]
