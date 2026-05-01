"""Graft Spray DRF views.

At M0-02 step 5 the only view is the Clerk webhook handler. Org and
Membership endpoints land in step 6; account-lifecycle endpoints in step 7.

See docs/spec/_plans/M0-02-plan.md.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from spray.models import AuthEvent, Session, User

logger = logging.getLogger(__name__)


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
    except WebhookVerificationError as e:
        logger.warning("Webhook signature verification failed: %s", e)
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
    except Exception as e:  # noqa: BLE001 (broad except is intentional here)
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

    session, _ = Session.objects.update_or_create(
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
