from django.urls import path

from . import views
from . import drf_views
from . import newsroom_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = "api"

urlpatterns = [
    path("news/me", newsroom_views.NewsroomMeView.as_view(), name="news_me"),
    path(
        "news/articles",
        newsroom_views.NewsArticlePublicListView.as_view(),
        name="news_articles_public",
    ),
    path(
        "news/articles/manage",
        newsroom_views.NewsArticleManageListCreateView.as_view(),
        name="news_articles_manage",
    ),
    path(
        "news/articles/manage/<uuid:article_id>",
        newsroom_views.NewsArticleManageDetailView.as_view(),
        name="news_articles_manage_detail",
    ),
    path(
        "news/images/upload",
        newsroom_views.NewsImageUploadView.as_view(),
        name="news_images_upload",
    ),
    path(
        "news/articles/<slug:slug>",
        newsroom_views.NewsArticlePublicDetailView.as_view(),
        name="news_articles_public_detail",
    ),
    path(
        "news/publishers",
        newsroom_views.NewsroomAccessListCreateView.as_view(),
        name="news_publishers",
    ),
    path(
        "news/publishers/<uuid:access_id>",
        newsroom_views.NewsroomAccessDetailView.as_view(),
        name="news_publishers_detail",
    ),
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
