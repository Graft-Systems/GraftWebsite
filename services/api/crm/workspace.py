"""Workspace resolution and bootstrap for CRM API views."""

from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist

from crm.constants import DEFAULT_RELATIONSHIP_STAGES, SEED_WORKSPACE_ID
from crm.models import CRMProfile, RelationshipStage, Workspace


def ensure_default_stages(workspace: Workspace) -> None:
    for key, label, sort_order in DEFAULT_RELATIONSHIP_STAGES:
        RelationshipStage.objects.get_or_create(
            workspace=workspace,
            key=key,
            defaults={"label": label, "sort_order": sort_order},
        )


def get_workspace_for_user(user) -> Workspace:
    """Return the user's CRM workspace, bootstrapping seed data when missing."""
    try:
        return user.crm_profile.workspace
    except (ObjectDoesNotExist, AttributeError):
        workspace, created = Workspace.objects.get_or_create(
            id=SEED_WORKSPACE_ID,
            defaults={"name": "Graft Systems"},
        )
        if created:
            ensure_default_stages(workspace)
        CRMProfile.objects.get_or_create(
            user=user,
            defaults={
                "workspace": workspace,
                "role": "admin" if getattr(user, "is_staff", False) else "member",
            },
        )
        return workspace
