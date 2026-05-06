"""Org-scoped manager + queryset for tenant-scoped models (M0-03 step 6).

Per spec section 9.2 every tenant-scoped row carries `org_id` (directly or
via FK chain). Two layers enforce isolation:

  1. Application layer: this manager. Reads default to `_unscoped=True`
     until `.for_org(org)` is called. Iterating an unscoped queryset on
     a tenant-scoped model raises `OrgScopeRequiredError`. The escape
     hatch `.unscoped()` is explicit so admin paths and tests opt in.

  2. Database layer (M0-03 step 8): PostgreSQL row-level security
     policies keyed off the `app.current_org_id` session GUC. Even if
     the application layer is bypassed (raw SQL, ORM bug, malicious
     code path), the DB returns zero rows for the wrong tenant.

The combination is belt-and-suspenders: the application layer surfaces
mistakes loudly in tests (raise, not silent leak); the DB layer is the
last line of defense.

Models attach the manager via `objects = OrgScopedManager(via="...")`.
The `via` kwarg names the FK lookup path to `org_id` for models that
reach Org transitively (e.g. `Block.vineyard.org_id` is `via="vineyard__org_id"`).
"""

from __future__ import annotations

from typing import Any

from django.db import models


class OrgScopeRequiredError(RuntimeError):
    """Raised when an unscoped queryset on a tenant-scoped model is iterated.

    Surfacing this as RuntimeError (not a silent fallthrough) is the entire
    point: missing `.for_org(...)` is a bug, and tests catch it at the
    iteration site rather than in production days later.
    """


class OrgScopedQuerySet(models.QuerySet):
    """QuerySet that requires explicit org-scoping before evaluation."""

    # `_via` is set by the manager when constructing the initial queryset.
    _via: str = "org_id"
    _scoped: bool = False

    def _clone(self, *args, **kwargs):
        c = super()._clone(*args, **kwargs)
        c._via = self._via
        c._scoped = self._scoped
        return c

    def for_org(self, org: Any) -> "OrgScopedQuerySet":
        """Filter to a single Org and mark the queryset as scoped."""
        org_id = getattr(org, "id", org)
        c = self.filter(**{self._via: org_id})
        c._scoped = True
        return c

    def unscoped(self) -> "OrgScopedQuerySet":
        """Explicit escape hatch for admin / migration / audit paths."""
        c = self.all()
        c._scoped = True
        return c

    def _check_scoped(self) -> None:
        if not self._scoped:
            raise OrgScopeRequiredError(
                f"queryset on {self.model.__name__} must call .for_org(org) "
                f"or .unscoped() before evaluation"
            )

    # Force the scope check at every evaluation entry point.
    def __iter__(self):
        self._check_scoped()
        return super().__iter__()

    def __len__(self):
        self._check_scoped()
        return super().__len__()

    def __bool__(self):
        self._check_scoped()
        return super().__bool__()

    def count(self):
        self._check_scoped()
        return super().count()

    def exists(self):
        self._check_scoped()
        return super().exists()

    def first(self):
        self._check_scoped()
        return super().first()

    def last(self):
        self._check_scoped()
        return super().last()

    def get(self, *args, **kwargs):
        self._check_scoped()
        return super().get(*args, **kwargs)


class OrgScopedManager(models.Manager.from_queryset(OrgScopedQuerySet)):
    """Manager that yields OrgScopedQuerySets with the right `_via` path.

    Usage:
        class Vineyard(models.Model):
            org = models.ForeignKey(Org, ...)
            objects = OrgScopedManager()

        class Block(models.Model):
            vineyard = models.ForeignKey(Vineyard, ...)
            objects = OrgScopedManager(via="vineyard__org_id")
    """

    def __init__(self, *, via: str = "org_id"):
        super().__init__()
        self._via = via

    def get_queryset(self) -> OrgScopedQuerySet:
        qs = OrgScopedQuerySet(self.model, using=self._db)
        qs._via = self._via
        # Defaults to unscoped; the user MUST call .for_org() or .unscoped()
        # before iterating. We do not auto-scope from a thread-local org
        # because that is silent magic; explicit scoping forces every call
        # site to declare its tenant intent.
        qs._scoped = False
        return qs

    def for_org(self, org: Any) -> OrgScopedQuerySet:
        return self.get_queryset().for_org(org)

    def unscoped(self) -> OrgScopedQuerySet:
        return self.get_queryset().unscoped()
