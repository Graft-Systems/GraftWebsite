"""Imagery upload helpers (M1-09 step 5).

Browser uploads bypass Django and PUT directly to S3 via a presigned
POST policy. Django's job is to:

  1. Mint the policy with `presigned_post(...)`. The policy enforces
     Content-Type and size constraints at the S3 level so the browser
     can't lie about what it's uploading.
  2. After the browser confirms a successful PUT, verify via S3 HEAD.
     This catches the "user closed the tab mid-upload" case and
     prevents Capture rows flipping to `uploaded` when nothing landed.
  3. Re-mint short-lived (5 min) GET URLs for serving images back.
"""

from __future__ import annotations

import logging
from typing import Any

import boto3
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


ALLOWED_MIME = {
    "image/jpeg",
    "image/heic",
    "image/heif",
    "video/mp4",
}
MAX_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB per spec §8.5

EXT_BY_MIME = {
    "image/jpeg": "jpg",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
}


def _client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.AWS_REGION,
    )


def s3_key_for(*, org_id, block_id, capture_id, ext: str) -> str:
    """Spec §17.2: per-org prefix isolation."""
    return f"{org_id}/{block_id}/{capture_id}.{ext}"


def presigned_post(
    s3_key: str, *, mime_type: str, max_size: int = MAX_SIZE_BYTES
) -> dict[str, Any]:
    """Return a POST policy + signed fields for the browser to PUT to S3.

    Browser usage:
        const fd = new FormData();
        for (const [k, v] of Object.entries(response.fields)) fd.append(k, v);
        fd.append("file", file);
        fetch(response.url, { method: "POST", body: fd });

    Returns `{url, fields}` where `fields` includes the signed policy.
    """
    return _client().generate_presigned_post(
        Bucket=settings.IMAGERY_BUCKET,
        Key=s3_key,
        Conditions=[
            {"Content-Type": mime_type},
            ["content-length-range", 1, max_size],
        ],
        Fields={"Content-Type": mime_type},
        ExpiresIn=300,  # 5 min, matches spec §17.1
    )


def presigned_get_url(s3_key: str) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.IMAGERY_BUCKET, "Key": s3_key},
        ExpiresIn=300,
    )


def head_object(s3_key: str) -> dict[str, Any] | None:
    """Return S3 metadata if the object exists, else None.

    Used by the finalize endpoint to verify the browser actually
    completed the PUT before flipping Capture.status to uploaded.
    """
    try:
        return _client().head_object(
            Bucket=settings.IMAGERY_BUCKET, Key=s3_key
        )
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return None
        logger.warning("head_object error for %s: %s", s3_key, e)
        return None
    except Exception as e:  # noqa: BLE001
        logger.warning("head_object unexpected error for %s: %s", s3_key, e)
        return None
