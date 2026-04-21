from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthcheck(_request):
    return JsonResponse({"ok": True, "service": "graft-api"})


urlpatterns = [
    path("", healthcheck),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
