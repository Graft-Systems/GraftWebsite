"""Graft Spray DRF views.

M0-02 step 5 (webhook) + step 6 (org + membership) + step 7 (account
lifecycle) + step 9 (consent toggles). Step 10 adds tests.

See docs/spec/_plans/M0-02-plan.md.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from django.conf import settings
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
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
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


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

    def get(self, request, org_id):
        # Set GUC explicitly because the URL kwarg already resolved here.
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

    def get(self, request, org_id, vineyard_id):
        set_current_org_id(str(org_id))
        return Response(VineyardSerializer(self._get(org_id, vineyard_id)).data)

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

    def get(self, request, org_id, block_id):
        set_current_org_id(str(org_id))
        return Response(BlockSerializer(self._get(org_id, block_id)).data)

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

    Filters: ?block_id=<uuid> (optional), ?status=uploaded (default).
    """

    permission_classes = [IsOrgViewer]

    def get(self, request, org_id):
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

        qs = qs.order_by("-created_at")[:200]
        return Response(CaptureSerializer(qs, many=True).data)


class CaptureDetailView(APIView):
    """GET / DELETE /api/spray/orgs/<org_id>/captures/<id>.

    DELETE archives (sets archived_at); the S3 object stays around for
    the data-lake retention window per spec §17.1.
    """

    permission_classes = [IsOrgViewer]

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
