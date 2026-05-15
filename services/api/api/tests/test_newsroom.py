"""Newsroom API tests."""

from __future__ import annotations

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from api.models import NewsArticle, NewsroomAccess
from spray.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def author_user():
    return User.objects.create(
        clerk_user_id="user_news_author",
        email="author@graft.test",
        name="News Author",
    )


@pytest.fixture
def manager_user():
    return User.objects.create(
        clerk_user_id="user_news_manager",
        email="manager@graft.test",
        name="News Manager",
    )


@pytest.fixture
def outsider_user():
    return User.objects.create(
        clerk_user_id="user_news_outsider",
        email="outsider@graft.test",
        name="Outsider",
    )


def test_public_list_only_published(api_client, author_user):
    NewsArticle.objects.create(
        slug="draft-piece",
        title="Draft",
        body="secret",
        status=NewsArticle.Status.DRAFT,
        author=author_user,
    )
    NewsArticle.objects.create(
        slug="live-piece",
        title="Live",
        body="hello world",
        excerpt="Hi",
        status=NewsArticle.Status.PUBLISHED,
        author=author_user,
        published_at="2026-05-01T12:00:00Z",
    )
    res = api_client.get("/api/news/articles")
    assert res.status_code == 200
    slugs = [a["slug"] for a in res.json()["articles"]]
    assert slugs == ["live-piece"]


def test_publisher_can_create(api_client, author_user):
    NewsroomAccess.objects.create(user=author_user, can_publish=True)
    api_client.force_authenticate(user=author_user)
    res = api_client.post(
        "/api/news/articles/manage",
        {
            "title": "First post",
            "body": "Body text",
            "excerpt": "Short",
            "status": "published",
        },
        format="json",
    )
    assert res.status_code == 201
    data = res.json()
    assert data["slug"] == "first-post"
    assert data["status"] == "published"
    assert NewsArticle.objects.filter(slug="first-post").exists()


def test_outsider_cannot_create(api_client, outsider_user):
    api_client.force_authenticate(user=outsider_user)
    res = api_client.post(
        "/api/news/articles/manage",
        {"title": "Nope", "body": "Nope", "status": "draft"},
        format="json",
    )
    assert res.status_code == 403


@override_settings(NEWSROOM_ADMIN_CLERK_IDS=["user_bootstrap_admin"])
def test_bootstrap_admin_can_manage_publishers(
    api_client, author_user
):
    bootstrap = User.objects.create(
        clerk_user_id="user_bootstrap_admin",
        email="bootstrap@graft.test",
        name="Bootstrap",
    )
    api_client.force_authenticate(user=bootstrap)
    res = api_client.post(
        "/api/news/publishers",
        {
            "email": author_user.email,
            "can_publish": True,
            "can_manage_permissions": False,
        },
        format="json",
    )
    assert res.status_code == 201
    assert NewsroomAccess.objects.filter(user=author_user, can_publish=True).exists()


def test_permission_manager_can_grant(api_client, manager_user, author_user):
    NewsroomAccess.objects.create(
        user=manager_user,
        can_publish=True,
        can_manage_permissions=True,
    )
    api_client.force_authenticate(user=manager_user)
    res = api_client.post(
        "/api/news/publishers",
        {"email": author_user.email, "can_publish": True},
        format="json",
    )
    assert res.status_code == 201
