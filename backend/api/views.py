import json
import logging
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import resend
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import (
    ContactSubmission,
    PredictionBatch,
    PredictionResult,
    WaitlistEntry,
)
from .prediction_tool_adapter import run_prediction_for_images

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


def _serialize_prediction_result(
    result: PredictionResult, request: HttpRequest | None = None
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "filename": result.filename,
        "prediction_weight": result.prediction_weight,
        "unit": result.unit,
        "model": result.model,
        "latency_ms": result.latency_ms,
        "depth_used": result.depth_used,
    }
    if result.ground_truth_weight is not None:
        payload["ground_truth_weight"] = result.ground_truth_weight
    if result.absolute_error is not None:
        payload["absolute_error"] = result.absolute_error
    if result.image:
        relative_url = result.image.url
        payload["image_url"] = (
            request.build_absolute_uri(relative_url) if request else relative_url
        )
    return payload


def _serialize_prediction_batch(
    batch: PredictionBatch, request: HttpRequest | None = None
) -> dict[str, Any]:
    ordered_results = list(batch.results.all().order_by("-id"))
    total_prediction_weight = sum(result.prediction_weight for result in ordered_results)
    total_unit = ordered_results[0].unit if ordered_results else "kg"
    return {
        "id": batch.id,
        "created_at": batch.created_at.isoformat(),
        "summary": {
            "processed": batch.processed_count,
            "model": batch.model_name or "unknown",
            "total_prediction_weight": total_prediction_weight,
            "total_unit": total_unit,
        },
        "results": [
            _serialize_prediction_result(result, request=request)
            for result in ordered_results
        ],
    }


@csrf_exempt
def estimate_history(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    raw_limit = request.GET.get("limit", "10")
    try:
        parsed_limit = int(raw_limit)
    except ValueError:
        return JsonResponse({"error": "limit must be an integer."}, status=400)

    limit = max(1, min(parsed_limit, 50))
    batches = PredictionBatch.objects.prefetch_related("results").order_by("-created_at")[:limit]
    return JsonResponse(
        {
            "batches": [_serialize_prediction_batch(batch, request=request) for batch in batches],
            "summary": {"count": len(batches), "limit": limit},
        }
    )


@csrf_exempt
def delete_estimate_batch(request: HttpRequest, batch_id: int) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    batch = PredictionBatch.objects.filter(id=batch_id).first()
    if batch is None:
        return JsonResponse({"error": "Batch not found."}, status=404)

    batch.delete()
    return JsonResponse({"ok": True, "id": batch_id})


@csrf_exempt
@require_POST
def estimate(request: HttpRequest) -> JsonResponse:
    content_type = request.content_type or ""

    if content_type.startswith("multipart/form-data"):
        files = request.FILES.getlist("files")
        if not files:
            return JsonResponse({"error": "No files provided"}, status=400)
        limited_files = files[:10]

        with tempfile.TemporaryDirectory(prefix="graft-estimate-") as tmp_dir:
            temp_paths: list[Path] = []
            uploads_by_name: dict[str, list[Any]] = defaultdict(list)
            for upload in limited_files:
                safe_name = Path(upload.name).name or "upload_image"
                out_path = Path(tmp_dir) / safe_name
                with out_path.open("wb") as target:
                    for chunk in upload.chunks():
                        target.write(chunk)
                temp_paths.append(out_path)
                uploads_by_name[safe_name].append(upload)

            try:
                results = run_prediction_for_images(temp_paths)
            except Exception as exc:
                log.exception("[estimate] prediction failed")
                return JsonResponse(
                    {
                        "error": "Prediction failed.",
                        "detail": str(exc),
                    },
                    status=500,
                )
            try:
                with transaction.atomic():
                    raw_batch_id = str(request.POST.get("batch_id", "")).strip()
                    batch: PredictionBatch | None = None
                    if raw_batch_id:
                        try:
                            candidate_id = int(raw_batch_id)
                            batch = PredictionBatch.objects.filter(id=candidate_id).first()
                        except ValueError:
                            batch = None

                    if batch is None:
                        batch = PredictionBatch.objects.create(
                            model_name=results[0]["model"] if results else "",
                            processed_count=0,
                        )

                    if results and not batch.model_name:
                        batch.model_name = str(results[0].get("model", ""))

                    persisted_results: list[PredictionResult] = []
                    for item in results:
                        filename = str(item.get("filename", ""))
                        matched_upload = (
                            uploads_by_name[filename].pop(0)
                            if uploads_by_name.get(filename)
                            else None
                        )
                        prediction_result = PredictionResult(
                            batch=batch,
                            filename=filename,
                            prediction_weight=float(item.get("prediction_weight", 0.0)),
                            ground_truth_weight=(
                                float(item["ground_truth_weight"])
                                if item.get("ground_truth_weight") is not None
                                else None
                            ),
                            absolute_error=(
                                float(item["absolute_error"])
                                if item.get("absolute_error") is not None
                                else None
                            ),
                            unit=str(item.get("unit", "kg")),
                            model=str(item.get("model", "")),
                            depth_used=(
                                str(item["depth_used"]) if item.get("depth_used") is not None else None
                            ),
                            latency_ms=int(item.get("latency_ms", 0) or 0),
                        )
                        if matched_upload is not None:
                            prediction_result.image = matched_upload
                        prediction_result.save()
                        persisted_results.append(prediction_result)
                    batch.processed_count = batch.results.count()
                    batch.save(update_fields=["model_name", "processed_count"])
                    persisted_results_by_id = {
                        result.id: result for result in persisted_results if result.id is not None
                    }
                    ordered_persisted_results = [
                        result
                        for result in batch.results.all().order_by("-id")
                        if result.id in persisted_results_by_id
                    ]
            except Exception:
                log.exception("[estimate] failed to persist prediction batch")
                return JsonResponse(
                    {
                        "error": "Prediction succeeded but history save failed.",
                    },
                    status=500,
                )

        return JsonResponse(
            {
                "results": [
                    _serialize_prediction_result(item, request=request)
                    for item in ordered_persisted_results
                ],
                "batch_id": batch.id,
                "summary": {
                    "processed": batch.processed_count,
                    "model": batch.model_name or "unknown",
                },
            }
        )

    if content_type.startswith("application/json"):
        return JsonResponse(
            {"error": "JSON mode is no longer supported. Use multipart/form-data with files."},
            status=415,
        )

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
