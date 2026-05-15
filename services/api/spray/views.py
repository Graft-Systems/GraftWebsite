"""Graft Spray DRF views.

M0-02 step 5 (webhook) + step 6 (org + membership) + step 7 (account
lifecycle) + step 9 (consent toggles). Step 10 adds tests.

See docs/spec/_plans/M0-02-plan.md.
"""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from spray.middleware import set_current_org_id
from spray.models import (
    AuthEvent,
    Block,
    ConsentRecord,
    DataLakeEvent,
    Membership,
    Org,
    Session,
    User,
    Vineyard,
)
from spray.permissions import IsOrgAdmin, IsOrgMember, IsOrgOwner, IsOrgViewer
from spray.serializers import (
    AccountDeleteSerializer,
    BlockSerializer,
    ConsentRecordSerializer,
    ConsentToggleSerializer,
    InviteSerializer,
    MembershipSerializer,
    OrgSerializer,
    RoleChangeSerializer,
    UserSerializer,
    VineyardSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Step 5: Clerk webhook
# ---------------------------------------------------------------------


@csrf_exempt
@require_POST
def clerk_webhook(request: HttpRequest) -> JsonResponse:
    """Clerk webhook ingestion endpoint.

    Validates the Svix signature using `CLERK_WEBHOOK_SIGNING_SECRET`,
    then dispatches on event type:

      - user.created, user.updated      -> upsert local User
      - user.deleted                    -> soft-delete local User
      - session.created                 -> create local Session row
      - session.removed                 -> mark Session.revoked_at

    Idempotent on Clerk's `evt_id` (same event replayed has no
    additional effect because update_or_create / get-or-no-op patterns
    are used throughout).

    Spec section 20.8; M0-02 plan section 4.5.
    """
    secret = getattr(settings, "CLERK_WEBHOOK_SIGNING_SECRET", "")
    if not secret:
        logger.error("CLERK_WEBHOOK_SIGNING_SECRET not configured")
        return JsonResponse(
            {"error": "webhook not configured"}, status=503
        )

    try:
        from svix.webhooks import Webhook, WebhookVerificationError
    except ImportError:
        logger.error("svix package not installed")
        return JsonResponse(
            {"error": "svix package missing"}, status=500
        )

    headers = {
        "svix-id": request.headers.get("Svix-Id", ""),
        "svix-timestamp": request.headers.get("Svix-Timestamp", ""),
        "svix-signature": request.headers.get("Svix-Signature", ""),
    }
    if not all(headers.values()):
        logger.warning("Webhook missing required Svix headers")
        return JsonResponse(
            {"error": "missing svix headers"}, status=400
        )

    payload_bytes = request.body
    try:
        wh = Webhook(secret)
        event = wh.verify(payload_bytes, headers)
    except (WebhookVerificationError, ValueError) as e:
        logger.warning("Webhook signature verification failed: %s", e)
        return JsonResponse({"error": "invalid signature"}, status=400)
    except Exception as e:  # noqa: BLE001
        # Malformed signature header (e.g. invalid base64) raises
        # binascii.Error in some svix versions; treat as invalid signature.
        logger.warning("Webhook signature parse error: %s", e)
        return JsonResponse({"error": "invalid signature"}, status=400)

    event_type = event.get("type", "")
    data = event.get("data", {}) or {}

    try:
        if event_type in ("user.created", "user.updated"):
            _handle_user_upsert(data, is_new=event_type == "user.created")
        elif event_type == "user.deleted":
            _handle_user_deleted(data)
        elif event_type == "session.created":
            _handle_session_created(data)
        elif event_type == "session.removed":
            _handle_session_removed(data)
        else:
            logger.info("Unhandled Clerk webhook event: %s", event_type)
    except Exception as e:  # noqa: BLE001
        logger.exception("Webhook handler error for %s: %s", event_type, e)
        return JsonResponse({"error": "handler error"}, status=500)

    return JsonResponse({"ok": True, "event_type": event_type})


def _primary_email(data: dict[str, Any]) -> str:
    emails = data.get("email_addresses") or []
    primary_id = data.get("primary_email_address_id")
    if primary_id:
        for entry in emails:
            if entry.get("id") == primary_id:
                return entry.get("email_address", "") or ""
    if emails:
        return emails[0].get("email_address", "") or ""
    return ""


def _primary_phone(data: dict[str, Any]) -> str | None:
    phones = data.get("phone_numbers") or []
    primary_id = data.get("primary_phone_number_id")
    if primary_id:
        for entry in phones:
            if entry.get("id") == primary_id:
                return entry.get("phone_number") or None
    if phones:
        return phones[0].get("phone_number") or None
    return None


def _full_name(data: dict[str, Any]) -> str:
    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    return f"{first} {last}".strip()


def _handle_user_upsert(data: dict[str, Any], *, is_new: bool) -> None:
    clerk_user_id = data.get("id")
    if not clerk_user_id:
        logger.warning("user.* event missing id")
        return

    user, created = User.objects.update_or_create(
        clerk_user_id=clerk_user_id,
        defaults={
            "email": _primary_email(data),
            "phone": _primary_phone(data),
            "name": _full_name(data),
        },
    )

    if created or is_new:
        AuthEvent.objects.create(
            user=user,
            type=AuthEvent.Type.SIGN_UP,
            metadata={
                "source": "clerk_webhook",
                "clerk_user_id": clerk_user_id,
                "is_new_record": created,
            },
        )


def _handle_user_deleted(data: dict[str, Any]) -> None:
    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return
    try:
        user = User.objects.get(clerk_user_id=clerk_user_id)
    except User.DoesNotExist:
        return

    if user.deleted_at is None:
        user.deleted_at = timezone.now()
        user.save(update_fields=["deleted_at"])

    AuthEvent.objects.create(
        user=user,
        type=AuthEvent.Type.ACCOUNT_DELETION_COMPLETED,
        metadata={"source": "clerk_webhook"},
    )


def _handle_session_created(data: dict[str, Any]) -> None:
    clerk_user_id = data.get("user_id")
    clerk_session_id = data.get("id")
    if not clerk_user_id or not clerk_session_id:
        return

    try:
        user = User.objects.get(clerk_user_id=clerk_user_id)
    except User.DoesNotExist:
        return

    Session.objects.update_or_create(
        clerk_session_id=clerk_session_id,
        defaults={"user": user},
    )

    AuthEvent.objects.create(
        user=user,
        type=AuthEvent.Type.LOGIN_SUCCESS,
        metadata={
            "source": "clerk_webhook",
            "session_id": clerk_session_id,
        },
    )


def _handle_session_removed(data: dict[str, Any]) -> None:
    clerk_session_id = data.get("id")
    if not clerk_session_id:
        return
    try:
        session = Session.objects.get(clerk_session_id=clerk_session_id)
    except Session.DoesNotExist:
        return

    if session.revoked_at is None:
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])

    AuthEvent.objects.create(
        user=session.user,
        type=AuthEvent.Type.LOGOUT,
        metadata={
            "source": "clerk_webhook",
            "session_id": clerk_session_id,
        },
    )


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _client_ip(request) -> str | None:
    """Return the client IP, or None if the value cannot be parsed as a valid IP.

    Production reverse-proxies (Render, Heroku, Cloudflare) can inject
    X-Forwarded-For with port suffixes ("10.0.0.1:54321") or bracketed
    IPv6 literals ("[::1]:8080"). PostgreSQL's ``inet`` type rejects both
    formats, so we strip extras before storing in AuthEvent.ip.
    """
    import ipaddress

    raw = request.META.get("HTTP_X_FORWARDED_FOR")
    candidate = raw.split(",")[0].strip() if raw else request.META.get("REMOTE_ADDR") or ""

    # Strip bracketed IPv6 with port: "[::1]:8080" → "::1"
    if candidate.startswith("["):
        candidate = candidate[1:].split("]")[0]
    # Strip IPv4 with port: "10.0.0.1:8080" → "10.0.0.1"
    elif ":" in candidate:
        parts = candidate.rsplit(":", 1)
        # Only strip the last segment if it looks like a port (all digits)
        if parts[1].isdigit():
            candidate = parts[0]

    try:
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        return None


def _user_agent(request) -> str:
    return request.headers.get("User-Agent", "")[:1000]


# ---------------------------------------------------------------------
# Step 6: Org and Membership endpoints
# ---------------------------------------------------------------------


class OrgCreateView(APIView):
    """POST /api/spray/orgs

    Create a new Org; the caller becomes its Owner via a Membership row.
    """

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = OrgSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = serializer.save()

        # Set the RLS GUC to the new Org's id so the Membership INSERT
        # passes the `org_id = current_setting('app.current_org_id')`
        # policy. Without this, the very first Membership for a fresh
        # Org gets denied at the DB layer because no GUC is set yet.
        set_current_org_id(str(org.id))

        Membership.objects.create(
            org=org,
            user=request.user,
            role=Membership.Role.OWNER,
        )

        AuthEvent.objects.create(
            user=request.user,
            org=org,
            type=AuthEvent.Type.ORG_CREATED,
            ip=_client_ip(request),
            user_agent=_user_agent(request),
            metadata={"name": org.name, "region": org.region},
        )

        return Response(
            OrgSerializer(org).data, status=status.HTTP_201_CREATED
        )


class MyOrgsView(APIView):
    """GET /api/spray/orgs/me

    Return all Memberships for the caller, with embedded Org summaries.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        memberships = (
            Membership.objects.filter(user=request.user)
            .select_related("org")
            .order_by("created_at")
        )
        return Response(
            {"memberships": MembershipSerializer(memberships, many=True).data}
        )


class OrgDetailView(APIView):
    """GET / PATCH / DELETE on /api/spray/orgs/<org_id>.

    GET: any Org member can read.
    PATCH: Org Admin or Owner can update name, region, settings.
    DELETE: Org Owner can archive (sets archived_at; does not hard-delete).
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer_alias()]
        if self.request.method == "PATCH":
            return [IsOrgAdmin()]
        if self.request.method == "DELETE":
            return [IsOrgOwner()]
        return [IsAuthenticated()]

    def get(self, request, org_id):
        org = get_object_or_404(Org, id=org_id)
        return Response(OrgSerializer(org).data)

    def patch(self, request, org_id):
        org = get_object_or_404(Org, id=org_id)
        serializer = OrgSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @transaction.atomic
    def delete(self, request, org_id):
        org = get_object_or_404(Org, id=org_id)
        if org.archived_at is not None:
            return Response(
                {"detail": "already archived"},
                status=status.HTTP_409_CONFLICT,
            )
        org.archived_at = timezone.now()
        org.save(update_fields=["archived_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def IsOrgViewer_alias():
    """Use IsOrgMember for read paths (any role with membership can read).

    Aliased to keep view permission lists readable. IsOrgMember matches
    OWNER/ADMIN/MEMBER; for read-also-VIEWER we'd use IsOrgViewer from
    permissions.py. Choosing IsOrgMember is intentional here so VIEWERs
    (read-only consultants) get a separate, explicit permission later.
    """
    from spray.permissions import IsOrgViewer

    return IsOrgViewer()


class OrgMembershipListView(APIView):
    """GET /api/spray/orgs/<org_id>/memberships

    List all members of the Org. Any Org member can read.
    """

    permission_classes = [IsOrgMember]

    def get(self, request, org_id):
        memberships = (
            Membership.objects.filter(org_id=org_id)
            .select_related("user", "org")
            .order_by("created_at")
        )
        return Response(MembershipSerializer(memberships, many=True).data)


class OrgInviteView(APIView):
    """POST /api/spray/orgs/<org_id>/invite

    Body: {email, role}. Owner or Admin can invite. The invited user
    must already exist (have signed up via Clerk); pending invites for
    not-yet-signed-up users land in M0-02a via Clerk's invitations API.
    """

    permission_classes = [IsOrgAdmin]

    @transaction.atomic
    def post(self, request, org_id):
        serializer = InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        role = serializer.validated_data["role"]

        try:
            user = User.objects.get(email__iexact=email, deleted_at__isnull=True)
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "user not found; user must sign up first",
                    "email": email,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        org = get_object_or_404(Org, id=org_id)

        membership, created = Membership.objects.get_or_create(
            org=org,
            user=user,
            defaults={"role": role},
        )
        if not created:
            return Response(
                {"detail": "user is already a member of this org"},
                status=status.HTTP_409_CONFLICT,
            )

        AuthEvent.objects.create(
            user=user,
            org=org,
            type=AuthEvent.Type.ORG_INVITE_ACCEPTED,
            ip=_client_ip(request),
            user_agent=_user_agent(request),
            metadata={
                "invited_by": str(request.user.id),
                "role": role,
            },
        )

        return Response(
            MembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class OrgMembershipDetailView(APIView):
    """PATCH / DELETE on /api/spray/orgs/<org_id>/memberships/<user_id>.

    PATCH: change role (Owner only).
    DELETE: remove member (Owner only).

    Cannot demote or remove the last Owner of an Org with other members.
    """

    permission_classes = [IsOrgOwner]

    @transaction.atomic
    def patch(self, request, org_id, user_id):
        membership = get_object_or_404(
            Membership, org_id=org_id, user_id=user_id
        )
        serializer = RoleChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data["role"]
        old_role = membership.role

        if new_role == old_role:
            return Response(MembershipSerializer(membership).data)

        # Cannot demote the last Owner.
        if old_role == Membership.Role.OWNER and new_role != Membership.Role.OWNER:
            owner_count = Membership.objects.filter(
                org_id=org_id, role=Membership.Role.OWNER
            ).count()
            if owner_count <= 1:
                return Response(
                    {
                        "detail": "cannot demote the last Owner; transfer ownership first",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        membership.role = new_role
        membership.save(update_fields=["role"])

        AuthEvent.objects.create(
            user=membership.user,
            org_id=org_id,
            type=AuthEvent.Type.ROLE_CHANGE,
            ip=_client_ip(request),
            user_agent=_user_agent(request),
            metadata={
                "old_role": old_role,
                "new_role": new_role,
                "changed_by": str(request.user.id),
            },
        )

        return Response(MembershipSerializer(membership).data)

    @transaction.atomic
    def delete(self, request, org_id, user_id):
        membership = get_object_or_404(
            Membership, org_id=org_id, user_id=user_id
        )

        # Cannot remove the last Owner of an org with other members.
        if membership.role == Membership.Role.OWNER:
            owner_count = Membership.objects.filter(
                org_id=org_id, role=Membership.Role.OWNER
            ).count()
            if owner_count <= 1:
                member_count = Membership.objects.filter(
                    org_id=org_id
                ).count()
                if member_count > 1:
                    return Response(
                        {
                            "detail": "cannot remove the last Owner while other members remain; transfer ownership first",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

        AuthEvent.objects.create(
            user=membership.user,
            org_id=org_id,
            type=AuthEvent.Type.ORG_MEMBER_REMOVED,
            ip=_client_ip(request),
            user_agent=_user_agent(request),
            metadata={
                "removed_by": str(request.user.id),
                "role": membership.role,
            },
        )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------
# Step 7: Account lifecycle
# ---------------------------------------------------------------------


class AccountDeleteView(APIView):
    """POST /api/spray/account/delete

    Body: `{confirm: true}`. Soft-deletes the caller's User row, archives
    any solo Orgs they are sole-Owner of, and emits an AuthEvent. Returns
    409 if the caller is the last Owner of an Org with other members.

    Apple App Review Guideline 5.1.1(v).
    """

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AccountDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data["confirm"]:
            return Response(
                {"detail": "must include confirm: true"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        owner_orgs = Org.objects.filter(
            memberships__user=user,
            memberships__role=Membership.Role.OWNER,
            archived_at__isnull=True,
        ).distinct()

        for org in owner_orgs:
            owner_count = Membership.objects.filter(
                org=org, role=Membership.Role.OWNER
            ).count()
            if owner_count > 1:
                # Other Owners exist; account deletion does not affect Org.
                continue
            member_count = Membership.objects.filter(org=org).count()
            if member_count > 1:
                return Response(
                    {
                        "detail": (
                            f"cannot delete account; transfer ownership of "
                            f"'{org.name}' first ({member_count - 1} other members would be orphaned)"
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            # Sole-Owner solo Org: archive it.
            org.archived_at = timezone.now()
            org.save(update_fields=["archived_at"])

        user.deleted_at = timezone.now()
        user.save(update_fields=["deleted_at"])

        AuthEvent.objects.create(
            user=user,
            type=AuthEvent.Type.ACCOUNT_DELETION_REQUESTED,
            ip=_client_ip(request),
            user_agent=_user_agent(request),
            metadata={"source": "self_service"},
        )

        # Note: data lake purge queues separately when Celery exists in
        # M0-04. Operational cascade (Memberships, Sessions, ConsentRecords)
        # happens at User.deleted_at via Django ORM cascade rules, but we
        # do not hard-delete the User row to preserve audit references.

        return Response(
            {"ok": True, "deleted_at": user.deleted_at.isoformat()},
            status=status.HTTP_200_OK,
        )


class AccountExportView(APIView):
    """POST /api/spray/account/export

    Synchronous JSON dump of the caller's data at M0-02. The full async +
    photo zip workflow lands in M0-04 once Celery exists. Per-user export
    within 30 days satisfies GDPR and CCPA.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        memberships = (
            Membership.objects.filter(user=user).select_related("org")
        )
        consents = ConsentRecord.objects.filter(user=user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "memberships": MembershipSerializer(memberships, many=True).data,
                "consent_records": ConsentRecordSerializer(consents, many=True).data,
                "exported_at": timezone.now().isoformat(),
                "format_version": "0.1-m0-02",
                "note": (
                    "Synchronous JSON dump at M0-02. Full async export + "
                    "photo zip lands in M0-04."
                ),
            }
        )


# ---------------------------------------------------------------------
# Step 9: Consent toggles
# ---------------------------------------------------------------------


class ConsentView(APIView):
    """GET /api/spray/account/consent

    Return the caller's consent records (one per category they have
    interacted with). Categories not yet toggled are absent from the
    response; the frontend treats absence as "not granted."

    POST /api/spray/account/consent

    Body: list of `{category, granted}` items. Upsert each. Each toggle
    emits a CONSENT_GRANTED or CONSENT_WITHDRAWN AuthEvent.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        consents = ConsentRecord.objects.filter(user=request.user)
        return Response(ConsentRecordSerializer(consents, many=True).data)

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, list):
            return Response(
                {"detail": "body must be a JSON array of {category, granted}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []
        for item in request.data:
            serializer = ConsentToggleSerializer(data=item)
            serializer.is_valid(raise_exception=True)
            category = serializer.validated_data["category"]
            granted = serializer.validated_data["granted"]

            now = timezone.now()
            record, created = ConsentRecord.objects.get_or_create(
                user=request.user,
                category=category,
                defaults={
                    "granted": granted,
                    "granted_at": now if granted else None,
                    "withdrawn_at": None if granted else now,
                },
            )
            if not created:
                if granted:
                    record.granted = True
                    if record.granted_at is None:
                        record.granted_at = now
                    record.withdrawn_at = None
                else:
                    record.granted = False
                    record.withdrawn_at = now
                record.save(update_fields=["granted", "granted_at", "withdrawn_at"])

            AuthEvent.objects.create(
                user=request.user,
                type=(
                    AuthEvent.Type.CONSENT_GRANTED
                    if granted
                    else AuthEvent.Type.CONSENT_WITHDRAWN
                ),
                ip=_client_ip(request),
                user_agent=_user_agent(request),
                metadata={"category": category},
            )

            results.append(ConsentRecordSerializer(record).data)

        return Response(results, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------
# M0-03 step 9: Vineyard + Block CRUD
# ---------------------------------------------------------------------


def _emit_lake_event(*, org, user, category: str, payload: dict) -> None:
    """Emit a DataLakeEvent through the schema-validated registry.

    Thin wrapper around `spray.lake.emit_event` so existing M0-03
    callsites keep working while M0-04's validation kicks in.
    """
    from spray.lake import emit_event

    emit_event(category=category, payload=payload, org=org, user=user)


class VineyardListCreateView(APIView):
    """GET / POST `/api/spray/orgs/<org_id>/vineyards`.

    GET: list Vineyards in the Org (any membership role can read).
    POST: create a Vineyard (Member or higher; not Viewer).
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsOrgMember()]
        return [IsOrgViewer()]

    @transaction.atomic
    def get(self, request, org_id):
        # Set GUC explicitly because the URL kwarg already resolved here.
        # @transaction.atomic keeps the GUC alive for subsequent ORM calls
        # (set_config(..., true) is transaction-local and would otherwise
        # clear before for_org() runs).
        set_current_org_id(str(org_id))
        vineyards = (
            Vineyard.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .order_by("created_at")
        )
        return Response(VineyardSerializer(vineyards, many=True).data)

    @transaction.atomic
    def post(self, request, org_id):
        set_current_org_id(str(org_id))
        org = get_object_or_404(Org, id=org_id, archived_at__isnull=True)
        serializer = VineyardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vineyard = serializer.save(org=org)

        _emit_lake_event(
            org=org,
            user=request.user,
            category="vineyard.created",
            payload={"vineyard_id": str(vineyard.id), "name": vineyard.name},
        )

        # M0-06 step 9: kick off async 14-day weather backfill so M1-07
        # (Gubler-Thomas) has a baseline. Best-effort — vineyard creation
        # response is unaffected if Celery is unreachable in dev sandboxes.
        try:
            from graft_worker.tasks.weather_pull import backfill_vineyard_weather
            backfill_vineyard_weather.delay(str(vineyard.id))
        except Exception:  # noqa: BLE001
            logger.exception("backfill enqueue failed; vineyard saved anyway")

        return Response(
            VineyardSerializer(vineyard).data, status=status.HTTP_201_CREATED
        )


class VineyardDetailView(APIView):
    """GET / PATCH / DELETE `/api/spray/orgs/<org_id>/vineyards/<vineyard_id>`."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer()]
        if self.request.method == "PATCH":
            return [IsOrgMember()]
        if self.request.method == "DELETE":
            return [IsOrgAdmin()]
        return [IsAuthenticated()]

    def _get(self, org_id, vineyard_id):
        return get_object_or_404(
            Vineyard.objects.for_org(org_id), id=vineyard_id
        )

    @transaction.atomic
    def get(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        return Response(VineyardSerializer(self._get(org_id, vineyard_id)).data)

    @transaction.atomic
    def patch(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        vineyard = self._get(org_id, vineyard_id)
        serializer = VineyardSerializer(vineyard, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _emit_lake_event(
            org=vineyard.org,
            user=request.user,
            category="vineyard.updated",
            payload={
                "vineyard_id": str(vineyard.id),
                "fields": list(request.data.keys()),
            },
        )
        return Response(serializer.data)

    @transaction.atomic
    def delete(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        vineyard = self._get(org_id, vineyard_id)
        if vineyard.archived_at is not None:
            return Response(
                {"detail": "already archived"},
                status=status.HTTP_409_CONFLICT,
            )
        now = timezone.now()
        vineyard.archived_at = now
        vineyard.save(update_fields=["archived_at"])
        # Cascade-archive child Blocks (default per plan §9 question 3).
        Block.objects.unscoped().filter(
            vineyard=vineyard, archived_at__isnull=True
        ).update(archived_at=now)

        _emit_lake_event(
            org=vineyard.org,
            user=request.user,
            category="vineyard.archived",
            payload={"vineyard_id": str(vineyard.id)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class BlockListCreateView(APIView):
    """GET / POST `/api/spray/orgs/<org_id>/vineyards/<vineyard_id>/blocks`."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsOrgMember()]
        return [IsOrgViewer()]

    @transaction.atomic
    def get(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        # Ensure the vineyard belongs to the org before listing its blocks.
        vineyard = get_object_or_404(
            Vineyard.objects.for_org(org_id), id=vineyard_id
        )
        blocks = (
            Block.objects.for_org(org_id)
            .filter(vineyard=vineyard, archived_at__isnull=True)
            .order_by("created_at")
        )
        return Response(BlockSerializer(blocks, many=True).data)

    @transaction.atomic
    def post(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        vineyard = get_object_or_404(
            Vineyard.objects.for_org(org_id), id=vineyard_id
        )
        serializer = BlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = serializer.save(vineyard=vineyard)

        _emit_lake_event(
            org=vineyard.org,
            user=request.user,
            category="block.created",
            payload={
                "block_id": str(block.id),
                "vineyard_id": str(vineyard.id),
                "name": block.name,
            },
        )
        return Response(BlockSerializer(block).data, status=status.HTTP_201_CREATED)


class BlockDetailView(APIView):
    """GET / PATCH / DELETE `/api/spray/orgs/<org_id>/blocks/<block_id>`."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer()]
        if self.request.method == "PATCH":
            return [IsOrgMember()]
        if self.request.method == "DELETE":
            return [IsOrgAdmin()]
        return [IsAuthenticated()]

    def _get(self, org_id, block_id):
        return get_object_or_404(
            Block.objects.for_org(org_id), id=block_id
        )

    @transaction.atomic
    def get(self, request, org_id, block_id):
        set_current_org_id(str(org_id))
        return Response(BlockSerializer(self._get(org_id, block_id)).data)

    @transaction.atomic
    def patch(self, request, org_id, block_id):
        set_current_org_id(str(org_id))
        block = self._get(org_id, block_id)
        serializer = BlockSerializer(block, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _emit_lake_event(
            org=block.vineyard.org,
            user=request.user,
            category="block.updated",
            payload={
                "block_id": str(block.id),
                "fields": list(request.data.keys()),
            },
        )
        return Response(serializer.data)

    @transaction.atomic
    def delete(self, request, org_id, block_id):
        set_current_org_id(str(org_id))
        block = self._get(org_id, block_id)
        if block.archived_at is not None:
            return Response(
                {"detail": "already archived"},
                status=status.HTTP_409_CONFLICT,
            )
        block.archived_at = timezone.now()
        block.save(update_fields=["archived_at"])
        _emit_lake_event(
            org=block.vineyard.org,
            user=request.user,
            category="block.archived",
            payload={"block_id": str(block.id)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------
# Pilot setup summary
# ---------------------------------------------------------------------


class SetupSummaryView(APIView):
    """GET /api/spray/orgs/<org_id>/setup-summary.

    Cached-store summary for dashboard onboarding. This intentionally
    avoids live vendor calls; integrations detail pages own vendor refresh.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id):
        set_current_org_id(str(org_id))
        return Response(_setup_summary_payload(org_id))


def _setup_summary_payload(org_id):
    from spray.models import (
        BlockVerdict,
        IntegrationConnection,
        SensorStation,
    )

    now = timezone.now()
    station_stale_after = now - timedelta(hours=2)
    health_stale_after = now - timedelta(hours=24)

    vineyards = Vineyard.objects.for_org(org_id).filter(archived_at__isnull=True)
    blocks = Block.objects.for_org(org_id).filter(
        vineyard__archived_at__isnull=True,
        archived_at__isnull=True,
    )
    integrations = IntegrationConnection.objects.for_org(org_id)
    active_integrations = integrations.filter(
        status=IntegrationConnection.Status.ACTIVE
    )
    stations = SensorStation.objects.for_org(org_id).filter(
        archived_at__isnull=True
    )
    mapped_stations = stations.filter(
        linked_blocks__isnull=False,
        linked_blocks__archived_at__isnull=True,
    ).distinct()
    stale_stations = stations.filter(last_seen_at__lt=station_stale_after)
    never_seen_stations = stations.filter(last_seen_at__isnull=True)
    stale_integrations = active_integrations.filter(
        last_health_at__lt=health_stale_after
    )
    never_checked_integrations = active_integrations.filter(
        last_health_at__isnull=True
    )
    verdicts = BlockVerdict.objects.for_org(org_id).filter(block__in=blocks)

    counts = {
        "vineyards": vineyards.count(),
        "blocks": blocks.count(),
        "integrations": integrations.count(),
        "active_integrations": active_integrations.count(),
        "stations": stations.count(),
        "mapped_stations": mapped_stations.count(),
        "unmapped_stations": max(stations.count() - mapped_stations.count(), 0),
        "stale_stations": stale_stations.count(),
        "never_seen_stations": never_seen_stations.count(),
        "stale_integrations": stale_integrations.count(),
        "never_checked_integrations": never_checked_integrations.count(),
        "verdicts": verdicts.count(),
    }
    steps = [
        {
            "id": "create_vineyard",
            "label": "Create vineyard",
            "complete": counts["vineyards"] > 0,
            "href": "/spray/vineyards",
        },
        {
            "id": "draw_blocks",
            "label": "Draw blocks",
            "complete": counts["blocks"] > 0,
            "href": "/spray/vineyards",
        },
        {
            "id": "connect_sensor",
            "label": "Connect sensor",
            "complete": counts["active_integrations"] > 0,
            "href": "/spray/integrations",
        },
        {
            "id": "map_station",
            "label": "Map station to block",
            "complete": counts["mapped_stations"] > 0,
            "href": "/spray/integrations",
        },
        {
            "id": "generate_verdict",
            "label": "Generate verdict",
            "complete": counts["verdicts"] > 0,
            "href": "/spray/dashboard#spray-directives",
        },
    ]

    warnings = []
    if counts["unmapped_stations"] > 0:
        warnings.append("Some stations are not linked to a block.")
    if counts["stale_stations"] > 0 or counts["never_seen_stations"] > 0:
        warnings.append("Some stations have no recent readings.")
    if counts["stale_integrations"] > 0 or counts["never_checked_integrations"] > 0:
        warnings.append("Some provider health checks are stale.")

    return {
        "org_id": str(org_id),
        "counts": counts,
        "steps": steps,
        "warnings": warnings,
        "generated_at": now.isoformat(),
    }


class DashboardSummaryView(APIView):
    """GET /api/spray/orgs/<org_id>/dashboard-summary."""

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id):
        from spray.models import BlockVerdict, IntegrationConnection, SensorStation
        from spray.serializers import BlockVerdictSerializer

        set_current_org_id(str(org_id))
        org = get_object_or_404(Org, id=org_id, archived_at__isnull=True)
        setup = _setup_summary_payload(org_id)
        now = timezone.now()
        station_stale_after = now - timedelta(hours=2)
        health_stale_after = now - timedelta(hours=24)

        vineyards = list(
            Vineyard.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .order_by("name")
        )
        blocks = list(
            Block.objects.for_org(org_id)
            .filter(vineyard__archived_at__isnull=True, archived_at__isnull=True)
            .select_related("vineyard")
            .order_by("vineyard__name", "name")
        )

        latest_by_block = {}
        for verdict in (
            BlockVerdict.objects.for_org(org_id)
            .filter(block__in=blocks)
            .order_by("block_id", "-date")
        ):
            latest_by_block.setdefault(str(verdict.block_id), verdict)

        block_rows = []
        for block in blocks:
            verdict = latest_by_block.get(str(block.id))
            block_rows.append(
                {
                    "id": str(block.id),
                    "name": block.name,
                    "vineyard_id": str(block.vineyard_id),
                    "vineyard_name": block.vineyard.name,
                    "variety": block.variety,
                    "latest_verdict": (
                        BlockVerdictSerializer(verdict).data if verdict else None
                    ),
                    "verdict_stale": (
                        bool(verdict)
                        and verdict.generated_at < now - timedelta(hours=26)
                    ),
                }
            )

        integrations = []
        for conn in IntegrationConnection.objects.for_org(org_id).order_by("vendor"):
            health_status = "disconnected"
            if conn.status == IntegrationConnection.Status.NEEDS_REAUTH:
                health_status = "needs_reauth"
            elif conn.status == IntegrationConnection.Status.ACTIVE:
                if conn.last_health_at is None:
                    health_status = "unchecked"
                elif conn.last_health_at < health_stale_after:
                    health_status = "health_stale"
                else:
                    health_status = "active"
            integrations.append(
                {
                    "id": str(conn.id),
                    "vendor": conn.vendor,
                    "vendor_account_id": conn.vendor_account_id,
                    "status": conn.status,
                    "health_status": health_status,
                    "last_health_at": (
                        conn.last_health_at.isoformat()
                        if conn.last_health_at
                        else None
                    ),
                    "last_health_detail": conn.last_health_detail,
                }
            )

        stations = []
        for station in (
            SensorStation.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .prefetch_related(
                Prefetch(
                    "linked_blocks",
                    queryset=Block.objects.for_org(org_id).filter(
                        archived_at__isnull=True
                    ),
                ),
            )
            .select_related("connection")
        ):
            linked = [b for b in station.linked_blocks.all() if b.archived_at is None]
            station_status = "active"
            if not linked:
                station_status = "unmapped"
            elif station.last_seen_at is None:
                station_status = "never_seen"
            elif station.last_seen_at < station_stale_after:
                station_status = "stale"
            stations.append(
                {
                    "id": str(station.id),
                    "name": station.name or station.vendor_station_id,
                    "vendor": station.connection.vendor,
                    "last_seen_at": (
                        station.last_seen_at.isoformat()
                        if station.last_seen_at
                        else None
                    ),
                    "status": station_status,
                    "linked_block_ids": [str(b.id) for b in linked],
                    "linked_block_names": [b.name for b in linked],
                }
            )

        latest_generated_at = max(
            (
                row["latest_verdict"]["generated_at"]
                for row in block_rows
                if row["latest_verdict"]
            ),
            default=None,
        )

        from spray.models import Capture
        from spray.serializers import CaptureSerializer

        recent_qs = (
            Capture.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .select_related("block", "block__vineyard")
            .order_by("-created_at")[:8]
        )
        recent_captures = CaptureSerializer(recent_qs, many=True).data

        spray_program = org.settings.get("spray_program") or {}
        frac_program = {
            "frac_rotation": str(spray_program.get("frac_rotation", "")),
            "allowed_products": str(spray_program.get("allowed_products", "")),
        }
        pilot_savings = org.settings.get("pilot_savings")
        if pilot_savings is None:
            pilot_savings = {
                "headline": "Savings vs calendar baseline",
                "amount_usd": None,
                "footnote": (
                    "Placeholder until §8.13 savings aggregation is enabled."
                ),
            }

        return Response(
            {
                "org": {
                    "id": str(org.id),
                    "name": org.name,
                    "region": org.region,
                    "settings": org.settings,
                    "is_demo": bool(org.settings.get("demo")),
                },
                "setup": setup,
                "vineyards": [
                    {
                        "id": str(v.id),
                        "name": v.name,
                        "region": v.region,
                        "is_demo": bool(v.settings.get("demo")),
                    }
                    for v in vineyards
                ],
                "blocks": block_rows,
                "integrations": integrations,
                "stations": stations,
                "latest_generated_at": latest_generated_at,
                "generated_at": now.isoformat(),
                "recent_captures": recent_captures,
                "frac_program": frac_program,
                "pilot_savings": pilot_savings,
            }
        )


# ---------------------------------------------------------------------
# M0-06 step 11: Provider-health admin endpoint
# ---------------------------------------------------------------------


class ProviderHealthView(APIView):
    """GET /api/spray/admin/provider-health.

    Returns liveness + latency for every registered weather and
    external-risk-index provider. Authenticated-only; ops triage tool.
    Sentry / Render alerting wraps this in M0-08.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from spray.providers import registry

        weather: dict[str, dict] = {}
        for slug in registry.known_weather_slugs():
            try:
                health = registry.get_weather(slug).health()
                weather[slug] = {
                    "ok": health.ok,
                    "latency_ms": health.latency_ms,
                    "detail": health.detail,
                }
            except Exception as e:  # noqa: BLE001
                weather[slug] = {
                    "ok": False,
                    "latency_ms": None,
                    "detail": f"health probe raised: {e}",
                }

        external: dict[str, dict] = {}
        for slug in registry.known_external_risk_slugs():
            try:
                health = registry.get_external_risk(slug).health()
                external[slug] = {
                    "ok": health.ok,
                    "latency_ms": health.latency_ms,
                    "detail": health.detail,
                }
            except Exception as e:  # noqa: BLE001
                external[slug] = {
                    "ok": False,
                    "latency_ms": None,
                    "detail": f"health probe raised: {e}",
                }

        return Response({"weather": weather, "external_risk_index": external})


# ---------------------------------------------------------------------
# M1-09 step 6: Capture upload endpoints
# ---------------------------------------------------------------------


class CaptureInitView(APIView):
    """POST /api/spray/orgs/<org_id>/blocks/<block_id>/captures/init.

    Mints a presigned S3 POST policy + creates a `pending` Capture row.
    """

    permission_classes = [IsOrgMember]

    @transaction.atomic
    def post(self, request, org_id, block_id):
        from spray.imagery import (
            ALLOWED_MIME,
            EXT_BY_MIME,
            MAX_SIZE_BYTES,
            presigned_post,
            s3_key_for,
        )
        from spray.models import Block, Capture
        from spray.serializers import CaptureInitSerializer, CaptureSerializer

        set_current_org_id(str(org_id))
        block = get_object_or_404(
            Block.objects.for_org(org_id), id=block_id
        )
        serializer = CaptureInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mime = serializer.validated_data["mime_type"]
        if mime not in ALLOWED_MIME:
            return Response(
                {"detail": f"unsupported mime type: {mime}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = EXT_BY_MIME[mime]
        capture_id = uuid.uuid4()
        s3_key = s3_key_for(
            org_id=org_id, block_id=block_id, capture_id=capture_id, ext=ext
        )
        capture = Capture.objects.create(
            id=capture_id,
            block=block,
            uploader=request.user,
            kind=serializer.validated_data["kind"],
            mime_type=mime,
            size_bytes=serializer.validated_data["size_bytes"],
            taken_at=serializer.validated_data.get("taken_at"),
            s3_key=s3_key,
        )

        try:
            post_data = presigned_post(
                s3_key, mime_type=mime, max_size=MAX_SIZE_BYTES
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("presigned_post failed for %s: %s", s3_key, e)
            return Response(
                {"detail": "could not mint upload URL"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "capture": CaptureSerializer(capture).data,
                "upload": post_data,
            },
            status=status.HTTP_201_CREATED,
        )


class CaptureFinalizeView(APIView):
    """POST /api/spray/orgs/<org_id>/captures/<capture_id>/finalize.

    Verifies the S3 object exists then flips status to `uploaded` and
    emits the `capture.uploaded` lake event.
    """

    permission_classes = [IsOrgMember]

    @transaction.atomic
    def post(self, request, org_id, capture_id):
        import uuid as _uuid

        from spray.imagery import head_object
        from spray.lake import emit_event
        from spray.models import Capture
        from spray.serializers import CaptureSerializer

        set_current_org_id(str(org_id))
        capture = get_object_or_404(
            Capture.objects.for_org(org_id), id=capture_id
        )
        if capture.status == Capture.Status.UPLOADED:
            return Response(CaptureSerializer(capture).data)

        head = head_object(capture.s3_key)
        if head is None:
            return Response(
                {"detail": "S3 object not found; upload incomplete"},
                status=status.HTTP_409_CONFLICT,
            )

        capture.status = Capture.Status.UPLOADED
        capture.uploaded_at = timezone.now()
        capture.size_bytes = head.get("ContentLength", capture.size_bytes)
        capture.save(update_fields=["status", "uploaded_at", "size_bytes"])

        emit_event(
            category="capture.uploaded",
            payload={
                "capture_id": str(capture.id),
                "block_id": str(capture.block_id),
                "kind": capture.kind,
                "s3_key": capture.s3_key,
                "size_bytes": capture.size_bytes,
                "mime_type": capture.mime_type,
                "taken_at": (
                    capture.taken_at.isoformat() if capture.taken_at else None
                ),
            },
            org=capture.block.vineyard.org,
            user=request.user,
        )

        return Response(CaptureSerializer(capture).data)


class CaptureListView(APIView):
    """GET /api/spray/orgs/<org_id>/captures.

    Filters: ?block_id=, ?status= (default uploaded), ?date_from=YYYY-MM-DD,
    ?date_to=YYYY-MM-DD (inclusive on created_at date), ?kind=photo|video,
    ?limit= (default 100, max 200).
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id):
        from django.utils.dateparse import parse_date

        from spray.models import Capture
        from spray.serializers import CaptureSerializer

        set_current_org_id(str(org_id))
        qs = (
            Capture.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .select_related("block", "block__vineyard")
        )

        block_id = request.query_params.get("block_id")
        if block_id:
            qs = qs.filter(block_id=block_id)

        status_filter = request.query_params.get("status", "uploaded")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)

        date_from = request.query_params.get("date_from")
        if date_from:
            parsed = parse_date(date_from)
            if parsed is None:
                return Response(
                    {"detail": "invalid date_from; use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(created_at__date__gte=parsed)

        date_to = request.query_params.get("date_to")
        if date_to:
            parsed = parse_date(date_to)
            if parsed is None:
                return Response(
                    {"detail": "invalid date_to; use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(created_at__date__lte=parsed)

        kind = request.query_params.get("kind")
        if kind in (Capture.Kind.PHOTO, Capture.Kind.VIDEO):
            qs = qs.filter(kind=kind)
        elif kind:
            return Response(
                {"detail": "invalid kind; use photo or video"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        limit_raw = request.query_params.get("limit", "100")
        try:
            limit = int(limit_raw)
        except (TypeError, ValueError):
            return Response(
                {"detail": "invalid limit"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = max(1, min(limit, 200))

        qs = qs.order_by("-created_at")[:limit]
        return Response(CaptureSerializer(qs, many=True).data)


class CaptureDetailView(APIView):
    """GET / DELETE /api/spray/orgs/<org_id>/captures/<id>.

    DELETE archives (sets archived_at); the S3 object stays around for
    the data-lake retention window per spec §17.1.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id, capture_id):
        from spray.models import Capture
        from spray.serializers import CaptureSerializer

        set_current_org_id(str(org_id))
        capture = get_object_or_404(
            Capture.objects.for_org(org_id), id=capture_id
        )
        return Response(CaptureSerializer(capture).data)

    @transaction.atomic
    def delete(self, request, org_id, capture_id):
        from spray.models import Capture

        set_current_org_id(str(org_id))
        capture = get_object_or_404(
            Capture.objects.for_org(org_id), id=capture_id
        )
        if capture.archived_at is not None:
            return Response(
                {"detail": "already archived"},
                status=status.HTTP_409_CONFLICT,
            )
        capture.archived_at = timezone.now()
        capture.save(update_fields=["archived_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------
# M1.5 PR-C: Aggregation engine — verdict endpoints (SA-2)
# ---------------------------------------------------------------------


class BlockVerdictLatestView(APIView):
    """GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/latest

    Returns the most recent BlockVerdict for the block. 404 if none yet.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id, block_id):
        from spray.models import Block, BlockVerdict
        from spray.serializers import BlockVerdictSerializer

        set_current_org_id(str(org_id))
        # Verify block belongs to caller's org via the block's vineyard.
        get_object_or_404(Block.objects.for_org(org_id), id=block_id)

        verdict = (
            BlockVerdict.objects.for_org(org_id)
            .filter(block_id=block_id)
            .order_by("-date")
            .first()
        )
        if verdict is None:
            return Response(
                {"detail": "no verdict yet for this block"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(BlockVerdictSerializer(verdict).data)


class BlockVerdictListView(APIView):
    """GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts?since=<iso>

    Paginated history. `since` is an ISO date; default = last 30 days.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id, block_id):
        from datetime import date, timedelta
        from spray.models import Block, BlockVerdict
        from spray.serializers import BlockVerdictSerializer

        set_current_org_id(str(org_id))
        get_object_or_404(Block.objects.for_org(org_id), id=block_id)

        since_param = request.query_params.get("since")
        if since_param:
            try:
                since_date = date.fromisoformat(since_param)
            except ValueError:
                return Response(
                    {"detail": "invalid 'since' date; use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            since_date = timezone.now().date() - timedelta(days=30)

        qs = (
            BlockVerdict.objects.for_org(org_id)
            .filter(block_id=block_id, date__gte=since_date)
            .order_by("-date")
        )
        return Response(
            {
                "since": since_date.isoformat(),
                "count": qs.count(),
                "results": BlockVerdictSerializer(qs[:200], many=True).data,
            }
        )


class BlockVerdictRecomputeView(APIView):
    """POST /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/recompute."""

    permission_classes = [IsOrgMember]

    def post(self, request, org_id, block_id):
        from django.conf import settings as dj_settings
        from spray.models import Block

        set_current_org_id(str(org_id))
        block = get_object_or_404(
            Block.objects.for_org(org_id).select_related("vineyard"),
            id=block_id,
            archived_at__isnull=True,
        )

        if getattr(dj_settings, "SPRAY_VERDICT_RECOMPUTE_SYNC", False):
            from spray.aggregation.block_verdict_job import execute_compute_block_verdict

            ok = execute_compute_block_verdict(str(block.id))
            logger.info(
                "directive recompute sync org=%s block=%s user=%s ok=%s",
                org_id,
                block_id,
                getattr(request.user, "id", None),
                ok,
            )
            return Response(
                {
                    "queued": False,
                    "sync": True,
                    "ok": ok,
                    "block_id": str(block.id),
                    "message": (
                        "Directive computed in-process "
                        "(SPRAY_VERDICT_RECOMPUTE_SYNC=true)."
                    ),
                },
                status=status.HTTP_200_OK,
            )

        try:
            from celery import current_app

            result = current_app.send_task(
                "graft_worker.tasks.aggregation_run.compute_block_verdict",
                args=[str(block.id)],
            )
            task_id = result.id
        except Exception as exc:  # noqa: BLE001
            logger.exception("recompute queue failed for block=%s", block_id)
            return Response(
                {
                    "detail": (
                        f"could not queue recompute: {exc}. "
                        "Run the Celery worker, or set SPRAY_VERDICT_RECOMPUTE_SYNC=true "
                        "in services/api/.env for local in-process runs."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.info(
            "directive recompute queued org=%s block=%s user=%s task=%s",
            org_id,
            block_id,
            getattr(request.user, "id", None),
            task_id,
        )
        return Response(
            {
                "queued": True,
                "sync": False,
                "task_id": task_id,
                "block_id": str(block.id),
                "message": "Directive refresh queued.",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class SprayRecordListCreateView(APIView):
    """GET/POST /api/spray/orgs/<org_id>/spray-records."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer()]
        return [IsOrgMember()]

    @transaction.atomic
    def get(self, request, org_id):
        from spray.models import SprayRecord
        from spray.serializers import SprayRecordSerializer

        set_current_org_id(str(org_id))
        qs = (
            SprayRecord.objects.for_org(org_id)
            .filter(archived_at__isnull=True)
            .select_related("block", "block__vineyard", "verdict")
            .order_by("-applied_at", "-created_at")
        )
        block_id = request.query_params.get("block_id")
        if block_id:
            qs = qs.filter(block_id=block_id)
        vineyard_id = request.query_params.get("vineyard_id")
        if vineyard_id:
            qs = qs.filter(block__vineyard_id=vineyard_id)
        date_from = _parse_optional_date(request.query_params.get("date_from"), "date_from")
        if isinstance(date_from, Response):
            return date_from
        if date_from:
            qs = qs.filter(applied_at__date__gte=date_from)
        date_to = _parse_optional_date(request.query_params.get("date_to"), "date_to")
        if isinstance(date_to, Response):
            return date_to
        if date_to:
            qs = qs.filter(applied_at__date__lte=date_to)
        return Response({"results": SprayRecordSerializer(qs[:200], many=True).data})

    @transaction.atomic
    def post(self, request, org_id):
        from spray.models import Block, BlockVerdict
        from spray.serializers import SprayRecordSerializer

        set_current_org_id(str(org_id))
        serializer = SprayRecordSerializer(
            data=request.data,
            context={"org_id": org_id},
        )
        serializer.is_valid(raise_exception=True)
        block = get_object_or_404(
            Block.objects.for_org(org_id),
            id=serializer.validated_data["block"].id,
            archived_at__isnull=True,
        )
        verdict = serializer.validated_data.get("verdict")
        if verdict is not None:
            get_object_or_404(
                BlockVerdict.objects.for_org(org_id),
                id=verdict.id,
                block=block,
            )
        record = serializer.save(block=block, created_by=request.user)
        return Response(
            SprayRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class SprayRecordDetailView(APIView):
    """GET/PATCH/DELETE /api/spray/orgs/<org_id>/spray-records/<record_id>."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer()]
        return [IsOrgMember()]

    def _get(self, org_id, record_id):
        from spray.models import SprayRecord

        return get_object_or_404(
            SprayRecord.objects.for_org(org_id).select_related(
                "block",
                "block__vineyard",
                "verdict",
            ),
            id=record_id,
        )

    @transaction.atomic
    def get(self, request, org_id, record_id):
        from spray.serializers import SprayRecordSerializer

        set_current_org_id(str(org_id))
        return Response(SprayRecordSerializer(self._get(org_id, record_id)).data)

    @transaction.atomic
    def patch(self, request, org_id, record_id):
        from spray.models import Block, BlockVerdict
        from spray.serializers import SprayRecordSerializer

        set_current_org_id(str(org_id))
        record = self._get(org_id, record_id)
        serializer = SprayRecordSerializer(
            record,
            data=request.data,
            partial=True,
            context={"org_id": org_id},
        )
        serializer.is_valid(raise_exception=True)
        block = serializer.validated_data.get("block")
        if block is not None:
            get_object_or_404(Block.objects.for_org(org_id), id=block.id)
        verdict = serializer.validated_data.get("verdict")
        if verdict is not None:
            target_block = block or record.block
            get_object_or_404(
                BlockVerdict.objects.for_org(org_id),
                id=verdict.id,
                block=target_block,
            )
        serializer.save()
        return Response(serializer.data)

    @transaction.atomic
    def delete(self, request, org_id, record_id):
        set_current_org_id(str(org_id))
        record = self._get(org_id, record_id)
        if record.archived_at is not None:
            return Response(
                {"detail": "already archived"},
                status=status.HTTP_409_CONFLICT,
            )
        record.archived_at = timezone.now()
        record.save(update_fields=["archived_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprayProgramSettingsView(APIView):
    """GET/PATCH /api/spray/orgs/<org_id>/program-settings."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsOrgViewer()]
        return [IsOrgAdmin()]

    @transaction.atomic
    def get(self, request, org_id):
        set_current_org_id(str(org_id))
        org = get_object_or_404(Org, id=org_id, archived_at__isnull=True)
        return Response(_program_settings(org))

    @transaction.atomic
    def patch(self, request, org_id):
        set_current_org_id(str(org_id))
        org = get_object_or_404(Org, id=org_id, archived_at__isnull=True)
        current = _program_settings(org)
        allowed_keys = set(current.keys())
        incoming = {
            key: value
            for key, value in request.data.items()
            if key in allowed_keys
        }
        next_settings = {**current, **incoming}
        org.settings = {**org.settings, "spray_program": next_settings}
        org.save(update_fields=["settings"])
        return Response(next_settings)


def _program_settings(org: Org) -> dict[str, Any]:
    defaults = {
        "program_type": "organic",
        "allowed_products": "",
        "frac_rotation": "",
        "cultivar_sensitivity": "normal",
        "canopy_density": "medium",
        "max_wind_mph": 10,
        "min_temp_f": 45,
        "max_temp_f": 85,
        "avoid_rain_hours": 12,
    }
    configured = org.settings.get("spray_program") or {}
    return {**defaults, **configured}


def _parse_optional_date(value: str | None, name: str):
    if not value:
        return None
    parsed = parse_date(value)
    if parsed is None:
        return Response(
            {"detail": f"invalid '{name}' date; use YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return parsed


# ---------------------------------------------------------------------
# M1.5 PR-F: Daily brief renderer endpoint (SA-2)
# ---------------------------------------------------------------------


class BlockVerdictBriefView(APIView):
    """GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/<verdict_id>/brief

    Returns a deterministic narrative brief for one BlockVerdict — headline,
    paragraphs, drivers, and resolved citations from `sources_master.csv`.

    LLM-authored prose lands in PR-F.5; until then this returns the
    template-rendered output.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id, block_id, verdict_id):
        from spray.lake import emit_event
        from spray.models import Block, BlockVerdict
        from spray.recommendation.orchestrator import render_brief
        from spray.serializers import BlockVerdictSerializer

        set_current_org_id(str(org_id))
        get_object_or_404(Block.objects.for_org(org_id), id=block_id)
        verdict = get_object_or_404(
            BlockVerdict.objects.for_org(org_id),
            id=verdict_id,
            block_id=block_id,
        )

        verdict_dict = BlockVerdictSerializer(verdict).data
        # Coerce DRF Decimal -> float for the renderer.
        for key in (
            "powdery_severity_1_10",
            "downy_severity_1_10",
            "powdery_confidence",
            "downy_confidence",
        ):
            value = verdict_dict.get(key)
            if value is not None:
                verdict_dict[key] = float(value)

        envelope = render_brief(verdict_dict)

        # Emit telemetry. Strip the internal `_telemetry` key before
        # returning to the caller — it's a private channel between the
        # orchestrator and this view.
        telemetry = envelope.pop("_telemetry", {}) or {}
        try:
            emit_event(
                category="brief.rendered",
                payload={
                    "org_id": str(org_id),
                    "block_id": str(block_id),
                    "verdict_id": str(verdict_id),
                    "renderer": envelope.get("renderer", ""),
                    "fallback_reason": envelope.get("fallback_reason"),
                    "prompt_tokens": int(telemetry.get("prompt_tokens", 0) or 0),
                    "completion_tokens": int(
                        telemetry.get("completion_tokens", 0) or 0
                    ),
                    "model": telemetry.get("model", "")
                    or telemetry.get("prompt_version", ""),
                    "latency_ms": int(telemetry.get("latency_ms", 0) or 0),
                    "generated_at": timezone.now()
                    .isoformat()
                    .replace("+00:00", "Z"),
                },
                org=verdict.block.vineyard.org,
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit brief.rendered failed")

        return Response(envelope)


class BlockVerdictAuditPdfView(APIView):
    """GET /api/spray/orgs/<org_id>/blocks/<block_id>/verdicts/<verdict_id>/audit.pdf

    Tamper-evident audit-log PDF. Regenerated on every download — the
    audit value comes from regeneration matching the live
    `audit_hash`. Caching would create stale-PDF risk.

    Permission: same `IsOrgViewer` gate as the brief endpoint.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id, block_id, verdict_id):
        from spray.models import Block, BlockVerdict
        from spray.recommendation.orchestrator import render_brief
        from spray.recommendation.pdf_audit import render_audit_pdf
        from spray.serializers import BlockVerdictSerializer

        set_current_org_id(str(org_id))
        block = get_object_or_404(Block.objects.for_org(org_id), id=block_id)
        verdict = get_object_or_404(
            BlockVerdict.objects.for_org(org_id),
            id=verdict_id,
            block_id=block_id,
        )

        verdict_dict = BlockVerdictSerializer(verdict).data
        for key in (
            "powdery_severity_1_10",
            "downy_severity_1_10",
            "powdery_confidence",
            "downy_confidence",
        ):
            value = verdict_dict.get(key)
            if value is not None:
                verdict_dict[key] = float(value)

        envelope = render_brief(verdict_dict)
        envelope.pop("_telemetry", None)

        block_label = (
            f"{block.vineyard.name} · {block.name}"
            if hasattr(block, "vineyard")
            else block.name
        )
        try:
            pdf_bytes = render_audit_pdf(
                verdict=verdict_dict, brief=envelope, block_label=block_label
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("audit PDF render failed for verdict=%s", verdict_id)
            return Response(
                {"detail": f"PDF render failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = (
            f'inline; filename="graft-spray-{verdict.date}-{str(verdict.id)[:8]}.pdf"'
        )
        # No caching — every download regenerates against the live verdict.
        resp["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        resp["Pragma"] = "no-cache"
        return resp


# ---------------------------------------------------------------------
# M1.5 PR-D: Sensor connector integrations (SA-2 §12A)
# ---------------------------------------------------------------------


def _new_oauth_state(org_id, vendor: str, ttl_minutes: int = 10):
    """Create + persist an opaque OAuth state token. The state is a
    URL-safe random string; we bind it to the Org by storing the row.
    Tampering is impossible (the row is the source of truth) and replay
    is bounded by the TTL.
    """
    import secrets
    from datetime import timedelta as _td

    from spray.models import OAuthState

    token = secrets.token_urlsafe(32)
    return OAuthState.objects.create(
        state=token,
        org_id=org_id,
        vendor=vendor,
        expires_at=timezone.now() + _td(minutes=ttl_minutes),
    )


class IntegrationListView(APIView):
    """GET /api/spray/orgs/<org_id>/integrations
    Returns the org's connections (any vendor). Tokens never serialized.
    """

    permission_classes = [IsOrgViewer]

    @transaction.atomic
    def get(self, request, org_id):
        from spray.models import IntegrationConnection
        from spray.serializers import IntegrationConnectionSerializer

        set_current_org_id(str(org_id))
        qs = (
            IntegrationConnection.objects.for_org(org_id)
            .order_by("-connected_at")
        )
        return Response(
            {"results": IntegrationConnectionSerializer(qs, many=True).data}
        )


class PesslOAuthStartView(APIView):
    """POST /api/spray/orgs/<org_id>/integrations/pessl/oauth/start
    Returns `{authorize_url}` for the frontend to redirect to.
    """

    permission_classes = [IsOrgAdmin]

    @transaction.atomic
    def post(self, request, org_id):
        from spray.connectors.sensors.pessl.oauth import build_authorize_url

        set_current_org_id(str(org_id))
        state_row = _new_oauth_state(org_id, vendor="pessl")
        try:
            url = build_authorize_url(state=state_row.state)
        except Exception as exc:  # noqa: BLE001
            logger.exception("PesslOAuthStartView: build_authorize_url failed")
            return Response(
                {"detail": f"oauth start failed: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"authorize_url": url, "state": state_row.state})


class PesslOAuthCallbackView(APIView):
    """GET /api/spray/integrations/pessl/oauth/callback?code=&state=

    No org in the URL — derived from `state`. Redirects on success;
    returns JSON error on failure (frontend handles via query param).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.shortcuts import redirect

        from spray.connectors import credentials as creds
        from spray.connectors.base import (
            ConnectorAuthError,
            ConnectorRateLimitError,
            ConnectorResponseError,
        )
        from spray.connectors.sensors.pessl.oauth import exchange_code
        from spray.models import IntegrationConnection, OAuthState

        code = request.query_params.get("code", "")
        state = request.query_params.get("state", "")
        error = request.query_params.get("error", "")

        if error:
            return Response(
                {"detail": f"pessl returned error: {error}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not code or not state:
            return Response(
                {"detail": "missing code or state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            state_row = OAuthState.objects.get(state=state, vendor="pessl")
        except OAuthState.DoesNotExist:
            return Response(
                {"detail": "invalid or unknown state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if state_row.consumed_at is not None:
            return Response(
                {"detail": "state already consumed"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if state_row.expires_at < timezone.now():
            return Response(
                {"detail": "state expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_blob = exchange_code(code)
        except ConnectorAuthError as exc:
            return Response(
                {"detail": f"oauth code rejected: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (ConnectorRateLimitError, ConnectorResponseError) as exc:
            return Response(
                {"detail": f"pessl unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        vendor_account_id = token_blob.pop("vendor_account_id")
        ciphertext = creds.encrypt_token_blob(token_blob)

        with transaction.atomic():
            set_current_org_id(str(state_row.org_id))
            connection, created = IntegrationConnection.objects.unscoped().update_or_create(
                org_id=state_row.org_id,
                vendor=IntegrationConnection.Vendor.PESSL,
                vendor_account_id=vendor_account_id,
                defaults={
                    "token_ciphertext": ciphertext,
                    "status": IntegrationConnection.Status.ACTIVE,
                    "disconnected_at": None,
                },
            )
            state_row.consumed_at = timezone.now()
            state_row.save(update_fields=["consumed_at"])

        try:
            _emit_lake_event(
                org=state_row.org,
                user=getattr(request, "spray_user", None),
                category="integration.connected",
                payload={
                    "org_id": str(state_row.org_id),
                    "connection_id": str(connection.id),
                    "vendor": "pessl",
                    "vendor_account_id": vendor_account_id,
                    "created": created,
                },
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit integration.connected failed")

        # Redirect back to the spray app integrations page.
        frontend_base = getattr(settings, "SPRAY_FRONTEND_BASE_URL", "")
        if frontend_base:
            return redirect(
                f"{frontend_base}/spray/integrations?connected=pessl"
            )
        return Response(
            {
                "ok": True,
                "connection_id": str(connection.id),
                "vendor": "pessl",
                "created": created,
            }
        )


class IntegrationStationListView(APIView):
    """GET /api/spray/orgs/<org_id>/integrations/<conn_id>/stations
    Live-fetches the vendor's stations + upserts SensorStation rows.
    """

    permission_classes = [IsOrgMember]

    @transaction.atomic
    def get(self, request, org_id, conn_id):
        # NB: this view makes an HTTP call to the vendor inside the
        # atomic block. That holds the DB transaction for the duration
        # of the call (typically <30s). Acceptable for a low-frequency
        # connect-flow endpoint; revisit if it surfaces as contention.
        from spray.connectors.base import (
            ConnectorAuthError,
            ConnectorRateLimitError,
            ConnectorResponseError,
        )
        from spray.connectors.registry import get_connector
        from spray.models import IntegrationConnection, SensorStation
        from spray.serializers import SensorStationSerializer

        set_current_org_id(str(org_id))
        connection = get_object_or_404(
            IntegrationConnection.objects.for_org(org_id), id=conn_id
        )
        connector = get_connector(connection.vendor)
        try:
            vendor_stations = connector.list_stations(connection)
        except ConnectorAuthError as exc:
            return Response(
                {"detail": f"reauth required: {exc}"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except (ConnectorRateLimitError, ConnectorResponseError) as exc:
            return Response(
                {"detail": f"vendor unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        with transaction.atomic():
            for vs in vendor_stations:
                SensorStation.objects.unscoped().update_or_create(
                    connection=connection,
                    vendor_station_id=vs.vendor_station_id,
                    defaults={
                        "name": vs.name or "",
                        "lat": vs.lat,
                        "lon": vs.lon,
                    },
                )

        qs = (
            SensorStation.objects.for_org(org_id)
            .filter(connection=connection, archived_at__isnull=True)
            .order_by("name")
            .prefetch_related(
                Prefetch(
                    "linked_blocks",
                    queryset=Block.objects.for_org(org_id),
                ),
            )
        )
        return Response({"results": SensorStationSerializer(qs, many=True).data})


class IntegrationStationLinkBlockView(APIView):
    """POST /api/spray/orgs/<org_id>/integrations/<conn_id>/stations/<station_id>/link-block
    Body: {"block_id": "uuid"}.
    """

    permission_classes = [IsOrgMember]

    @transaction.atomic
    def post(self, request, org_id, conn_id, station_id):
        from spray.models import (
            Block,
            IntegrationConnection,
            SensorStation,
            SensorStationBlock,
        )

        set_current_org_id(str(org_id))
        get_object_or_404(
            IntegrationConnection.objects.for_org(org_id), id=conn_id
        )
        station = get_object_or_404(
            SensorStation.objects.for_org(org_id),
            id=station_id,
            connection_id=conn_id,
        )
        block_id = request.data.get("block_id")
        if not block_id:
            return Response(
                {"detail": "block_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        block = get_object_or_404(Block.objects.for_org(org_id), id=block_id)

        SensorStationBlock.objects.get_or_create(
            station=station,
            block=block,
            defaults={"linked_by": getattr(request, "spray_user", None)},
        )
        return Response({"ok": True}, status=status.HTTP_201_CREATED)


class IntegrationStationPullReadingsView(APIView):
    """POST …/integrations/<conn_id>/stations/<station_id>/pull-readings

    Fetches readings from the vendor (Davis / Pessl / METER pull API) and
    upserts ``SensorReading`` rows. By default queues Celery
    ``pull_sensor_station``; with ``{"sync": true}`` runs
    ``spray.sensor_reading_pull.execute_pull_sensor_station`` in the API
    process (no ``graft_worker`` import — works with plain ``runserver``).
    """

    permission_classes = [IsOrgMember]

    def post(self, request, org_id, conn_id, station_id):
        from django.conf import settings as dj_settings
        from spray.models import IntegrationConnection, SensorStation

        set_current_org_id(str(org_id))
        connection = get_object_or_404(
            IntegrationConnection.objects.for_org(org_id), id=conn_id
        )
        station = get_object_or_404(
            SensorStation.objects.for_org(org_id),
            id=station_id,
            connection_id=conn_id,
        )
        if connection.status != IntegrationConnection.Status.ACTIVE:
            return Response(
                {"detail": "connection is not active"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw = request.data.get("sync")
        if raw is None:
            sync = bool(getattr(dj_settings, "DEBUG", False))
        else:
            sync = raw is True or (
                isinstance(raw, str) and raw.lower() in ("1", "true", "yes")
            )

        vendor_slug = str(connection.vendor)
        task_name = "graft_worker.tasks.sensor_pull.pull_sensor_station"

        if sync:
            from spray.connectors.base import (
                ConnectorRateLimitError,
                ConnectorResponseError,
            )
            from spray.sensor_reading_pull import execute_pull_sensor_station

            try:
                n = int(execute_pull_sensor_station(str(station.id), vendor_slug))
            except ConnectorRateLimitError as exc:
                logger.warning(
                    "station pull sync rate limited org=%s station=%s %s",
                    org_id,
                    station_id,
                    exc,
                )
                return Response(
                    {
                        "detail": str(exc),
                        "sync": True,
                        "queued": False,
                        "readings_upserted": 0,
                        "station_id": str(station.id),
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            except ConnectorResponseError as exc:
                logger.warning(
                    "station pull sync vendor response org=%s station=%s %s",
                    org_id,
                    station_id,
                    exc,
                )
                return Response(
                    {
                        "detail": str(exc),
                        "sync": True,
                        "queued": False,
                        "readings_upserted": 0,
                        "station_id": str(station.id),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            logger.info(
                "station pull sync org=%s station=%s vendor=%s wrote=%s",
                org_id,
                station_id,
                vendor_slug,
                n,
            )
            return Response(
                {
                    "sync": True,
                    "queued": False,
                    "readings_upserted": n,
                    "station_id": str(station.id),
                },
                status=status.HTTP_200_OK,
            )

        try:
            from celery import current_app

            result = current_app.send_task(
                task_name,
                args=[str(station.id), vendor_slug],
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("pull queue failed station=%s", station_id)
            return Response(
                {
                    "detail": (
                        f"could not queue pull: {exc}. "
                        'POST again with JSON body {"sync": true} to run in-process, '
                        "or start Redis + Celery worker."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.info(
            "station pull queued org=%s station=%s vendor=%s task=%s",
            org_id,
            station_id,
            vendor_slug,
            result.id,
        )
        return Response(
            {
                "queued": True,
                "sync": False,
                "task_id": result.id,
                "station_id": str(station.id),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class IntegrationDisconnectView(APIView):
    """DELETE /api/spray/orgs/<org_id>/integrations/<conn_id>
    Soft-delete: sets status=disconnected. Historical readings preserved.
    """

    permission_classes = [IsOrgAdmin]

    @transaction.atomic
    def delete(self, request, org_id, conn_id):
        from spray.models import IntegrationConnection

        set_current_org_id(str(org_id))
        connection = get_object_or_404(
            IntegrationConnection.objects.for_org(org_id), id=conn_id
        )
        connection.status = IntegrationConnection.Status.DISCONNECTED
        connection.disconnected_at = timezone.now()
        connection.save(update_fields=["status", "disconnected_at"])

        try:
            _emit_lake_event(
                org=connection.org,
                user=getattr(request, "spray_user", None),
                category="integration.disconnected",
                payload={
                    "org_id": str(org_id),
                    "connection_id": str(connection.id),
                    "vendor": connection.vendor,
                },
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit integration.disconnected failed")

        return Response({"ok": True})


# ---------------------------------------------------------------------
# M1.5 PR-E: Davis + METER paste-key connect + METER webhook receiver
# ---------------------------------------------------------------------


class DavisConnectView(APIView):
    """POST /api/spray/orgs/<org_id>/integrations/davis/connect

    Body: {api_key, api_secret, label?}.
    Validates via Davis /v2/stations smoke call before saving the
    encrypted blob.

    For integration testing against Davis's shared hardware stream, set
    env ``DAVIS_DEMO_MODE=true`` (still requires a real WeatherLink API key +
    secret). The client appends ``demo=true`` on each request and surfaces
    the public demo station when the vendor list is empty.
    """

    permission_classes = [IsOrgAdmin]

    def post(self, request, org_id):
        from spray.connectors import credentials as creds
        from spray.connectors.base import (
            ConnectorAuthError,
            ConnectorRateLimitError,
            ConnectorResponseError,
        )
        from spray.connectors.sensors.davis.client import DavisClient
        from spray.models import IntegrationConnection

        api_key = (request.data.get("api_key") or "").strip()
        api_secret = (request.data.get("api_secret") or "").strip()
        if not api_key or not api_secret:
            return Response(
                {"detail": "api_key and api_secret required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Smoke-validate.
        try:
            client = DavisClient(creds={"api_key": api_key, "api_secret": api_secret})
            stations = client.list_stations()
        except ConnectorAuthError as exc:
            return Response(
                {"detail": f"Davis rejected the credentials: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (ConnectorRateLimitError, ConnectorResponseError) as exc:
            return Response(
                {"detail": f"Davis unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Use the first station's account/uuid as a stable account id;
        # fall back to a hash of the api_key.
        import hashlib
        account_id = ""
        if stations and isinstance(stations[0], dict):
            account_id = str(
                stations[0].get("account_id")
                or stations[0].get("station_id_uuid")
                or stations[0].get("station_id")
                or ""
            )
        if not account_id:
            account_id = hashlib.sha256(api_key.encode()).hexdigest()[:16]

        ciphertext = creds.encrypt_token_blob(
            {"api_key": api_key, "api_secret": api_secret}
        )

        with transaction.atomic():
            # GUC must live inside the same transaction as the write
            # (set_config(..., true) is transaction-local).
            set_current_org_id(str(org_id))
            conn, created = IntegrationConnection.objects.unscoped().update_or_create(
                org_id=org_id,
                vendor=IntegrationConnection.Vendor.DAVIS,
                vendor_account_id=account_id,
                defaults={
                    "token_ciphertext": ciphertext,
                    "status": IntegrationConnection.Status.ACTIVE,
                    "disconnected_at": None,
                },
            )

        try:
            _emit_lake_event(
                org=conn.org,
                user=getattr(request, "spray_user", None),
                category="integration.connected",
                payload={
                    "org_id": str(org_id),
                    "connection_id": str(conn.id),
                    "vendor": "davis",
                    "vendor_account_id": account_id,
                    "created": created,
                },
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit integration.connected (davis) failed")

        return Response(
            {"ok": True, "connection_id": str(conn.id), "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MeterConnectView(APIView):
    """POST /api/spray/orgs/<org_id>/integrations/meter/connect

    Body: {token, label?}.
    Validates via METER /devices/ smoke call before saving. Generates
    a per-connection webhook_secret and returns it ONCE (the user pastes
    it into METER ZENTRA Cloud's Push setup). The secret is encrypted
    alongside the bearer token.
    """

    permission_classes = [IsOrgAdmin]

    def post(self, request, org_id):
        from spray.connectors import credentials as creds
        from spray.connectors.base import (
            ConnectorAuthError,
            ConnectorRateLimitError,
            ConnectorResponseError,
        )
        from spray.connectors.sensors.meter.client import MeterClient
        from spray.connectors.sensors.meter.webhook import (
            generate_webhook_secret,
        )
        from spray.models import IntegrationConnection

        token = (request.data.get("token") or "").strip()
        if not token:
            return Response(
                {"detail": "token required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = MeterClient(creds={"token": token, "webhook_secret": ""})
            devices = client.list_devices()
        except ConnectorAuthError as exc:
            return Response(
                {"detail": f"METER rejected the token: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (ConnectorRateLimitError, ConnectorResponseError) as exc:
            return Response(
                {"detail": f"METER unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        webhook_secret = generate_webhook_secret()
        import hashlib
        account_id = ""
        if devices and isinstance(devices[0], dict):
            account_id = str(
                devices[0].get("account_id")
                or devices[0].get("organization_id")
                or ""
            )
        if not account_id:
            account_id = hashlib.sha256(token.encode()).hexdigest()[:16]

        ciphertext = creds.encrypt_token_blob(
            {"token": token, "webhook_secret": webhook_secret}
        )

        with transaction.atomic():
            # GUC must live inside the same transaction as the write
            # (set_config(..., true) is transaction-local).
            set_current_org_id(str(org_id))
            conn, created = IntegrationConnection.objects.unscoped().update_or_create(
                org_id=org_id,
                vendor=IntegrationConnection.Vendor.METER,
                vendor_account_id=account_id,
                defaults={
                    "token_ciphertext": ciphertext,
                    "status": IntegrationConnection.Status.ACTIVE,
                    "disconnected_at": None,
                },
            )

        try:
            _emit_lake_event(
                org=conn.org,
                user=getattr(request, "spray_user", None),
                category="integration.connected",
                payload={
                    "org_id": str(org_id),
                    "connection_id": str(conn.id),
                    "vendor": "meter",
                    "vendor_account_id": account_id,
                    "created": created,
                },
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit integration.connected (meter) failed")

        return Response(
            {
                "ok": True,
                "connection_id": str(conn.id),
                "created": created,
                # Returned ONCE — the user must paste this into METER's
                # Push setup. Never re-displayed by any other endpoint.
                "webhook_secret": webhook_secret,
                "webhook_url": (
                    f"{getattr(settings, 'SPRAY_API_BASE_URL', '')}"
                    "/api/spray/integrations/meter/webhook"
                ),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@csrf_exempt
@require_POST
def meter_webhook(request: HttpRequest) -> JsonResponse:
    """POST /api/spray/integrations/meter/webhook

    Public path. METER ZENTRA Cloud Push API delivers formdata POSTs
    here in real time. We validate `X-MET-Signature` (HMAC-SHA256 of
    the raw body) against the connection's stored `webhook_secret`,
    look up the SensorStation by `device_sn`, normalize, and upsert.

    Returns 202 on success. 4xx on bad signature, unknown device, or
    malformed payload. Never reveals whether a device exists across
    orgs (constant 4xx shape).
    """
    from spray.connectors import credentials as creds
    from spray.connectors.sensors.meter.normalizer import normalize_push_payload
    from spray.connectors.sensors.meter.webhook import (
        SIGNATURE_HEADER,
        parse_meter_form_payload,
        verify_signature,
    )
    from spray.lake import emit_event
    from spray.models import (
        IntegrationConnection,
        SensorReading,
        SensorStation,
    )

    raw_body = request.body or b""
    sig_header = request.headers.get(SIGNATURE_HEADER, "")
    if not sig_header:
        return JsonResponse(
            {"detail": "missing signature header"}, status=400
        )

    # Parse form data first to extract device_sn → connection lookup.
    try:
        payload = parse_meter_form_payload(dict(request.POST.items()))
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    try:
        device_sn, rows = normalize_push_payload(payload)
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    # Locate the SensorStation. ALL Meter connections + station rows
    # are unscoped here (no Clerk JWT, no org context); we lock down
    # via HMAC.
    station = (
        SensorStation.objects.unscoped()
        .select_related("connection", "connection__org")
        .filter(
            connection__vendor=IntegrationConnection.Vendor.METER,
            connection__status=IntegrationConnection.Status.ACTIVE,
            vendor_station_id=device_sn,
            archived_at__isnull=True,
        )
        .first()
    )
    if station is None:
        # Don't disclose existence; constant 401 across all reject paths
        # makes account enumeration harder.
        return JsonResponse({"detail": "unauthorized"}, status=401)

    try:
        blob = creds.decrypt_token_blob(station.connection.token_ciphertext)
    except creds.CredentialError:
        return JsonResponse({"detail": "credential error"}, status=500)
    secret = blob.get("webhook_secret", "")
    if not verify_signature(secret, raw_body, sig_header):
        return JsonResponse({"detail": "unauthorized"}, status=401)

    if not rows:
        return JsonResponse({"detail": "no readings"}, status=202)

    readings = [
        SensorReading(
            station=station,
            ts=row["ts"],
            air_temp_c=row.get("air_temp_c"),
            rh_pct=row.get("rh_pct"),
            leaf_wetness_min=row.get("leaf_wetness_min"),
            precip_mm=row.get("precip_mm"),
            wind_speed_ms=row.get("wind_speed_ms"),
            quality_flag=SensorReading.QualityFlag.OK,
        )
        for row in rows
    ]

    with transaction.atomic():
        SensorReading.objects.unscoped().bulk_create(
            readings,
            update_conflicts=True,
            update_fields=[
                "air_temp_c",
                "rh_pct",
                "leaf_wetness_min",
                "precip_mm",
                "wind_speed_ms",
                "quality_flag",
            ],
            unique_fields=["station", "ts"],
        )
        latest_ts = max(r.ts for r in readings)
        if station.last_seen_at is None or latest_ts > station.last_seen_at:
            station.last_seen_at = latest_ts
            station.save(update_fields=["last_seen_at"])

    org = station.connection.org
    for r in readings:
        try:
            emit_event(
                category="sensor.reading_pulled",
                payload={
                    "org_id": str(station.connection.org_id),
                    "connection_id": str(station.connection.id),
                    "station_id": str(station.id),
                    "vendor": "meter",
                    "vendor_station_id": station.vendor_station_id,
                    "ts": r.ts.isoformat().replace("+00:00", "Z"),
                    "air_temp_c": float(r.air_temp_c) if r.air_temp_c is not None else None,
                    "rh_pct": float(r.rh_pct) if r.rh_pct is not None else None,
                    "leaf_wetness_min": float(r.leaf_wetness_min) if r.leaf_wetness_min is not None else None,
                    "precip_mm": float(r.precip_mm) if r.precip_mm is not None else None,
                    "wind_speed_ms": float(r.wind_speed_ms) if r.wind_speed_ms is not None else None,
                    "quality_flag": r.quality_flag,
                    "source": "meter",
                    "device_id": station.vendor_station_id,
                },
                org=org,
            )
        except Exception:  # noqa: BLE001
            logger.exception("emit sensor.reading_pulled (meter webhook) failed")

    try:
        emit_event(
            category="sensor.webhook_received",
            payload={
                "org_id": str(station.connection.org_id),
                "connection_id": str(station.connection.id),
                "vendor": "meter",
                "payload_size_bytes": len(raw_body),
                "reading_count": len(readings),
                "accepted_at": timezone.now()
                .isoformat()
                .replace("+00:00", "Z"),
            },
            org=org,
        )
    except Exception:  # noqa: BLE001
        logger.exception("emit sensor.webhook_received failed")

    return JsonResponse({"ok": True, "reading_count": len(readings)}, status=202)
