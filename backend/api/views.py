import json
import logging
from typing import Any

import resend
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import ContactSubmission, WaitlistEntry

log = logging.getLogger(__name__)


# ───────────────── /api/contact ─────────────────

def _parse_contact_body(request: HttpRequest) -> dict[str, object]:
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise ValueError("Body must be valid JSON.")
    if not isinstance(data, dict):
        raise ValueError("Body must be a JSON object.")

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()

    errors: dict[str, str] = {}
    if not name:
        errors["name"] = "Name is required."
    elif len(name) > 200:
        errors["name"] = "Name must be 200 characters or fewer."

    if not email:
        errors["email"] = "Email is required."
    elif len(email) > 254:
        errors["email"] = "Email is too long."
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors["email"] = "Valid email is required."

    if not message:
        errors["message"] = "Message is required."
    elif len(message) > 5000:
        errors["message"] = "Message must be 5000 characters or fewer."

    # vineyard_size_acres is optional
    vineyard_size_raw = data.get("vineyard_size_acres")
    vineyard_size: int | None = None
    if vineyard_size_raw not in (None, ""):
        try:
            vineyard_size = int(vineyard_size_raw)
            if vineyard_size < 0 or vineyard_size > 100000:
                errors["vineyard_size_acres"] = "Enter a number between 0 and 100000."
                vineyard_size = None
        except (TypeError, ValueError):
            errors["vineyard_size_acres"] = "Vineyard size must be a number."

    if errors:
        raise ValueError(errors)

    return {
        "name": name,
        "email": email,
        "message": message,
        "vineyard_size_acres": vineyard_size,
    }


def _send_contact_email(submission: ContactSubmission) -> None:
    """Send the contact email via Resend. Updates submission status in place."""
    api_key = settings.RESEND_API_KEY
    if not api_key:
        log.warning("[contact] RESEND_API_KEY not set — skipping email send.")
        submission.email_status = ContactSubmission.EmailStatus.SKIPPED
        submission.save(update_fields=["email_status"])
        return

    resend.api_key = api_key
    try:
        result = resend.Emails.send(
            {
                "from": settings.CONTACT_FROM_EMAIL,
                "to": [settings.CONTACT_TO_EMAIL],
                "reply_to": submission.email,
                "subject": f"New contact form submission from {submission.name}",
                "text": (
                    f"From: {submission.name} <{submission.email}>\n\n"
                    f"{submission.message}"
                ),
            }
        )
        message_id = (result or {}).get("id", "") if isinstance(result, dict) else ""
        submission.email_status = ContactSubmission.EmailStatus.SENT
        submission.resend_message_id = message_id
        submission.save(update_fields=["email_status", "resend_message_id"])
    except Exception as exc:  # Resend raises a bare Exception subclass
        log.exception("[contact] Resend send failed")
        submission.email_status = ContactSubmission.EmailStatus.FAILED
        submission.error_message = str(exc)[:4000]
        submission.save(update_fields=["email_status", "error_message"])
        raise


@csrf_exempt
@require_POST
def contact(request: HttpRequest) -> JsonResponse:
    # Honeypot: bots typically fill every field. A non-empty `website`
    # returns success without saving — denies them useful signal.
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        body = {}
    if isinstance(body, dict) and str(body.get("website", "")).strip():
        return JsonResponse({"ok": True})

    try:
        fields = _parse_contact_body(request)
    except ValueError as exc:
        payload: dict[str, Any] = {"error": "Validation failed"}
        if isinstance(exc.args[0], dict):
            payload["issues"] = exc.args[0]
        else:
            payload["error"] = str(exc)
        return JsonResponse(payload, status=400)

    submission = ContactSubmission.objects.create(
        name=fields["name"],
        email=fields["email"],
        message=fields["message"],
        vineyard_size_acres=fields["vineyard_size_acres"],
    )

    try:
        _send_contact_email(submission)
    except Exception:
        return JsonResponse(
            {
                "error": (
                    "Your message was saved but we couldn't send it right now. "
                    "Please email graftsystems@gmail.com directly."
                ),
                "id": submission.id,
            },
            status=502,
        )

    return JsonResponse(
        {
            "ok": True,
            "id": submission.id,
            "email_status": submission.email_status,
            "resend_message_id": submission.resend_message_id,
        }
    )


# ───────────────── /api/estimate ─────────────────

def _hash_string(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _simulate_estimate(filename: str) -> dict[str, Any]:
    """Placeholder for the real ML model — deterministic per filename."""
    seed = _hash_string(filename)
    base = 120 + (seed % 180)
    spread = 20 + ((seed >> 4) % 30)
    bear = base - spread
    bull = base + spread
    blended = round(bear * 0.25 + base * 0.5 + bull * 0.25)
    return {
        "filename": filename,
        "bear": bear,
        "base": base,
        "bull": bull,
        "blended": blended,
        "unit": "grams",
        "model": "simulation-v0",
    }


@csrf_exempt
@require_POST
def estimate(request: HttpRequest) -> JsonResponse:
    content_type = request.content_type or ""

    if content_type.startswith("multipart/form-data"):
        files = request.FILES.getlist("files")
        if not files:
            return JsonResponse({"error": "No files provided"}, status=400)
        results = [_simulate_estimate(f.name) for f in files[:10]]
        return JsonResponse({"results": results})

    if content_type.startswith("application/json"):
        try:
            body = json.loads(request.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        filenames = body.get("filenames")
        if not isinstance(filenames, list):
            return JsonResponse(
                {"error": "Body must include { filenames: string[] }"}, status=400
            )
        names = [str(n) for n in filenames if isinstance(n, str)][:10]
        results = [_simulate_estimate(n) for n in names]
        return JsonResponse({"results": results})

    return JsonResponse(
        {
            "error": (
                "Unsupported content type. Use multipart/form-data or application/json."
            )
        },
        status=415,
    )


# ───────────────── /api/waitlist ─────────────────

@csrf_exempt
@require_POST
def waitlist(request: HttpRequest) -> JsonResponse:
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Body must be valid JSON."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Body must be a JSON object."}, status=400)

    # Honeypot: any non-empty value silently succeeds without saving.
    if str(data.get("website", "")).strip():
        return JsonResponse({"ok": True})

    email = str(data.get("email", "")).strip()
    source = str(data.get("source", "")).strip()[:64]

    if not email:
        return JsonResponse({"error": "Email is required."}, status=400)
    if len(email) > 254:
        return JsonResponse({"error": "Email is too long."}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Valid email is required."}, status=400)

    entry, _created = WaitlistEntry.objects.get_or_create(
        email=email,
        defaults={"source": source},
    )
    return JsonResponse({"ok": True, "id": entry.id})
