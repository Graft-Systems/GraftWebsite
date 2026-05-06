from django.urls import path

from . import views
from . import drf_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = "api"

urlpatterns = [
    path("contact", views.contact, name="contact"),
    path("estimate", views.estimate, name="estimate"),
    path("estimate/history", views.estimate_history, name="estimate_history"),
    path(
        "estimate/history/<int:batch_id>",
        views.delete_estimate_batch,
        name="delete_estimate_batch",
    ),
    path("waitlist", views.waitlist, name="waitlist"),

    # JWT / auth endpoints (login returns access/refresh tokens)
    path("auth/login", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register", drf_views.register_disabled, name="register_disabled"),

    # Protected filler page — frontend can redirect users here after auth.
    path("toolsdashboard", drf_views.ToolsDashboardView.as_view(), name="toolsdashboard"),
]
