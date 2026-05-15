"""Permission classes for the Graft newsroom API."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from rest_framework import permissions

from api.models import NewsroomAccess


def _is_authenticated_spray_user(request: Any) -> bool:
    user = getattr(request, "user", None)
    if user is None:
        return False
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "deleted_at", None) is not None:
        return False
    return True


def _clerk_id_is_bootstrap_admin(request: Any) -> bool:
    clerk_id = getattr(request.user, "clerk_user_id", "")
    allowed = getattr(settings, "NEWSROOM_ADMIN_CLERK_IDS", [])
    return bool(clerk_id and clerk_id in allowed)


def _get_access(request: Any) -> NewsroomAccess | None:
    if not _is_authenticated_spray_user(request):
        return None
    try:
        return request.user.newsroom_access
    except NewsroomAccess.DoesNotExist:
        return None


class IsNewsroomPublisher(permissions.BasePermission):
    """User may create and edit news articles."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated_spray_user(request):
            return False
        if _clerk_id_is_bootstrap_admin(request):
            return True
        access = _get_access(request)
        return access is not None and access.can_publish


class IsNewsroomPermissionManager(permissions.BasePermission):
    """User may grant or revoke newsroom publish access."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated_spray_user(request):
            return False
        if _clerk_id_is_bootstrap_admin(request):
            return True
        access = _get_access(request)
        return access is not None and access.can_manage_permissions
