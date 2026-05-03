"""Per-request `app.current_org_id` GUC for RLS (M0-03 step 7).

Sets a Postgres session GUC on every request based on the resolved Org
context (URL kwarg, request body, or `X-Org-Id` header — same precedence
as the DRF permissions module). Postgres RLS policies declared in
migration `0003_rls_policies` filter rows where `org_id` does not match
the GUC.

`SET LOCAL` clears at transaction-end so connection pooling is safe:
the next request inherits the GUC's empty default until it sets its own.

Quirk worth noting: the GUC value is the bare UUID string (or empty).
RLS policies cast `org_id::text` and compare to `current_setting('app.current_org_id', true)`.
The `, true` flag means "return empty string if unset" instead of
raising — which is what we want; an unauthenticated visitor or an
authenticated user with no org context simply sees zero rows.
"""

from __future__ import annotations

from typing import Any, Callable

from django.db import connection
from django.http import HttpRequest, HttpResponse


def _resolve_org_id(request: HttpRequest) -> str | None:
    """Mirror of `spray.permissions._resolve_org_id` for non-DRF middleware.

    Order: URL kwarg `org_id`, then body `org_id`, then `X-Org-Id` header.
    Middleware runs before the view so URL kwargs aren't bound to the
    request yet; we do a best-effort resolve from the resolved view-match
    if available, else fall back to body/header.
    """
    # Resolved view-match exposes URL kwargs.
    match = getattr(request, "resolver_match", None)
    if match and match.kwargs.get("org_id"):
        return str(match.kwargs["org_id"])

    # Body — JSON requests only. We don't fully parse the body here to
    # avoid consuming the stream; only multipart/form-encoded bodies
    # have org_id at this point. JSON bodies set the GUC inside the view
    # via `set_current_org_id()` if needed.
    if hasattr(request, "POST") and request.POST.get("org_id"):
        return str(request.POST["org_id"])

    header = request.headers.get("X-Org-Id")
    if header:
        return str(header)
    return None


def set_current_org_id(org_id: str | None) -> None:
    """Set the `app.current_org_id` GUC for the current connection.

    Safe to call repeatedly during a single request; the LAST call wins.
    `SET LOCAL` scopes to the surrounding transaction so it clears on
    commit/rollback. If called outside a transaction (raw connection),
    Django wraps each request in one, so this is fine.
    """
    if connection.vendor != "postgresql":
        # SQLite or other backends don't support session GUCs; the RLS
        # policies live in Postgres-only migrations anyway. No-op for
        # any non-postgres backend so dev sandboxes keep working.
        return
    with connection.cursor() as cursor:
        if org_id:
            cursor.execute("SELECT set_config('app.current_org_id', %s, true)", [str(org_id)])
        else:
            cursor.execute("SELECT set_config('app.current_org_id', '', true)")


class CurrentOrgMiddleware:
    """Sets `app.current_org_id` from the resolved org context per request."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Best-effort early set from header; the view may overwrite via
        # set_current_org_id() once it has a more authoritative value
        # (e.g. JSON body, freshly-created Org).
        org_id = _resolve_org_id(request)
        set_current_org_id(org_id)
        try:
            return self.get_response(request)
        finally:
            # Defensive: explicitly clear so a connection returned to
            # the pool with a stale GUC cannot leak across requests.
            set_current_org_id(None)
