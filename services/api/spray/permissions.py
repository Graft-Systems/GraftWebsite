"""DRF permission classes enforcing the four-role RBAC from spec section 20.2.

Used as `permission_classes = [IsOrgOwner]` (or similar) on DRF views.
The four roles in increasing privilege:

    VIEWER < MEMBER < ADMIN < OWNER

Org context is resolved from `view.kwargs['org_id']` first, then from
`request.data.get('org_id')` for write paths that pass org_id in body.
If no org context can be determined, the permission denies.

Spec section 20.4; M0-02 plan section 4.4.
"""

from __future__ import annotations

from typing import Any

from rest_framework import permissions

from spray.models import Membership


def _resolve_org_id(request: Any, view: Any) -> str | None:
    """Pick the active org_id from the request, returning None if absent."""
    org_id = view.kwargs.get("org_id") if hasattr(view, "kwargs") else None
    if org_id:
        return str(org_id)
    if hasattr(request, "data"):
        body = request.data.get("org_id")
        if body:
            return str(body)
    header = request.headers.get("X-Org-Id")
    if header:
        return str(header)
    return None


def _is_authenticated(request: Any) -> bool:
    user = getattr(request, "user", None)
    if user is None:
        return False
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "deleted_at", None) is not None:
        return False
    return True


class IsAuthenticatedSpray(permissions.BasePermission):
    """Caller is an authenticated, non-deleted Spray user."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        return _is_authenticated(request)


class IsOrgViewer(permissions.BasePermission):
    """Caller has any role (VIEWER or higher) in the targeted Org."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated(request):
            return False
        org_id = _resolve_org_id(request, view)
        if not org_id:
            return False
        return Membership.objects.filter(
            org_id=org_id, user=request.user
        ).exists()


class IsOrgMember(permissions.BasePermission):
    """Caller has MEMBER role or higher (not VIEWER) in the targeted Org."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated(request):
            return False
        org_id = _resolve_org_id(request, view)
        if not org_id:
            return False
        return Membership.objects.filter(
            org_id=org_id,
            user=request.user,
            role__in=[
                Membership.Role.MEMBER,
                Membership.Role.ADMIN,
                Membership.Role.OWNER,
            ],
        ).exists()


class IsOrgAdmin(permissions.BasePermission):
    """Caller is OWNER or ADMIN of the targeted Org."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated(request):
            return False
        org_id = _resolve_org_id(request, view)
        if not org_id:
            return False
        return Membership.objects.filter(
            org_id=org_id,
            user=request.user,
            role__in=[Membership.Role.OWNER, Membership.Role.ADMIN],
        ).exists()


class IsOrgOwner(permissions.BasePermission):
    """Caller is OWNER of the targeted Org."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if not _is_authenticated(request):
            return False
        org_id = _resolve_org_id(request, view)
        if not org_id:
            return False
        return Membership.objects.filter(
            org_id=org_id,
            user=request.user,
            role=Membership.Role.OWNER,
        ).exists()
