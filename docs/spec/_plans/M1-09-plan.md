# M1-09 Plan — Photo/Video Capture Upload (Web)

**Status:** PLAN ONLY. No implementation in this commit. Implementation begins after Benson approves.
**Branch:** `graft-spray/m1/capture-upload-web`
**PR target:** `graft-spray/main`
**Depends on:** M0-03 (Block model) merged. M0-04 (S3 + worker tier + lake events) merged. M0-05 (Vineyard map UI) merged.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §8.5](../Graft-Spray-App-Spec.md), §17.1 (signed URLs), §19. [`CODEBASE_PLAN.md` §6 PR #9](../CODEBASE_PLAN.md).
**Estimated diff size:** Medium (~900 LoC: backend + frontend split roughly evenly).
**Estimated effort:** 6 to 9 hours of implementation, plus ~10 minutes of Benson on AWS S3 imagery bucket creation.

---

## 1. Goal

After this PR lands:

- A new `Capture` Django model holds metadata for every uploaded photo/video. The actual file lives in a dedicated S3 imagery bucket; only the S3 key is stored in Postgres.
- Two new endpoints: `POST /api/spray/orgs/<org>/blocks/<block>/captures/init` returns a pre-signed S3 PUT URL + a Capture row in `pending` state. `POST /api/spray/orgs/<org>/captures/<capture_id>/finalize` flips the Capture to `uploaded` once the browser confirms the PUT succeeded. `GET /api/spray/orgs/<org>/captures/<id>` returns metadata + a pre-signed GET URL (5-min TTL) for serving the image back.
- A new `<CaptureUploader />` React component on the Vineyard detail page (when a Block is selected) lets users drag-drop or file-pick up to 10 photos at once. Progress bars per file, retry on failure, optimistic Capture rows in the side panel.
- A new `apps/web/app/spray/(app)/captures/page.tsx` lists all captures across the user's vineyards, filterable by block + date, with thumbnail previews.
- Every successful upload emits a `capture.uploaded` `DataLakeEvent`. M0-04's worker forwards it to the lake bucket on the next 15-min tick.
- A new S3 imagery bucket (`graft-spray-imagery-dev`) — separate from the lake bucket — with per-org prefix isolation (`<org_id>/<block_id>/<capture_id>.<ext>`) and a 5-min signed URL expiry.

This PR does NOT yet wire:
- ML inference. That's M1-10 (cloud) and M1-11 (correction loop). M1-09 just lands the upload pipeline; the captures sit there ungraded until M1-10 ships.
- iOS native capture (M2; depends on Expo + offline buffering).
- Multipart upload for files >5 MB. Spec §8.5 says iOS chunks >5 MB; web caps at 25 MB single-part. Single-part covers the M1 web slice.
- HEIC → JPEG transcoding on the server. Browsers handle HEIC in Safari natively; Chrome/Firefox accept the upload but display falls back to "tap to download". Server-side transcode lands in M1-10 alongside ML preprocessing.
- Multi-photo cluster aggregation (M1-10's calibrated single-cluster severity output uses the average; M1-09 just stores the rows).
- Capture deletion / archive. M1-09 supports the "uploaded" lifecycle only; archive lands in M1-10.

## 2. Decisions locked

| Topic | Resolution | Source |
|---|---|---|
| **Bucket strategy** | Dedicated `graft-spray-imagery-<env>` S3 bucket (separate from `graft-spray-lake-<env>`). Imagery has different retention rules (per spec §17.1, indefinite if user consents to training, 90 days if not), and separating them simplifies KMS-CMK swap in M0-08. | Spec §17.1 + this plan §3 |
| Upload path | Browser → presigned S3 PUT (NOT proxied through Django). Saves Render bandwidth + cuts upload latency. CORS configured on the bucket. | Spec §17.1 + this plan §3 |
| Signed URL TTL | 5 min for PUT (matches spec §17.1); 5 min for GET (re-mint per page load). | Spec §17.1 |
| Allowed file types | `image/jpeg`, `image/heic`, `image/heif`, `video/mp4`. Server validates the MIME via the presigned URL's `Content-Type` constraint. | Spec §8.5 |
| Max file size | 25 MB enforced via the presigned URL's `Content-Length-Range` constraint. Single-part upload only at M1-09. | Spec §8.5 |
| Capture states | `pending` (init created, PUT URL minted, no S3 confirmation yet), `uploaded` (finalize endpoint confirmed via S3 HEAD), `failed` (init aged out >5 min without finalize). | This plan §4.4 |
| Per-org isolation | S3 key path: `<org_id>/<block_id>/<capture_id>.<ext>`. Bucket policy denies cross-prefix list/get. | Spec §17.2 |
| Lake event emit | One `capture.uploaded` event per finalize. Payload includes `capture_id`, `block_id`, `kind` (photo/video), `s3_key`, `size_bytes`, `taken_at`, `mime_type`. | Spec §8.5 |

## 3. Pre-flight checklist

These get captured / confirmed before merge:

- [ ] **AWS S3 imagery bucket** `graft-spray-imagery-dev` created in `us-west-2`. Same encryption + Block Public Access settings as the lake bucket.
- [ ] **Bucket CORS** policy added: allow `PUT` from `https://*.vercel.app`, `https://graftsystems.com`, and `http://localhost:3000`. Spec §17.1 implicit.
- [ ] **IAM policy** `graft-spray-imagery-rw` created with `s3:PutObject + GetObject + HeadObject` scoped to the new bucket. Attach to the existing `graft-spray-worker` user (worker handles signed-URL minting via boto3).
- [ ] Two new env vars on Render API service: `IMAGERY_BUCKET=graft-spray-imagery-dev`, `AWS_REGION=us-west-2` (already set; confirm).
- [ ] No new Render Redis / worker provisioning.
- [ ] CHANGELOG.md updated.
- [ ] CODEBASE_PLAN.md PR #9 row flipped to ready-for-merge.

## 4. Implementation steps

### Step 1: Plan PR (THIS COMMIT)

This file is the only change.

### Step 2: `Capture` model

In `services/api/spray/models.py`:

```python
class Capture(models.Model):
    class Kind(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"     # PUT URL minted, awaiting S3 confirmation
        UPLOADED = "uploaded", "Uploaded"   # Finalize confirmed
        FAILED = "failed", "Failed"        # Aged out without finalize

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(
        Block, on_delete=models.CASCADE, related_name="captures"
    )
    uploader = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="captures"
    )
    kind = models.CharField(max_length=10, choices=Kind.choices)
    s3_key = models.CharField(max_length=400, unique=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=80, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True, db_index=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager(via="block__vineyard__org_id")

    class Meta:
        indexes = [
            models.Index(fields=["block", "-uploaded_at"]),
            models.Index(fields=["status", "created_at"]),
        ]
```

Tenant scope traverses through `block__vineyard__org_id` (same chain as Block).

### Step 3: Migration

`services/api/spray/migrations/0006_capture.py` creates the table + indexes. RLS policy added in the same migration: tenant filter on `(SELECT v.org_id FROM spray_vineyard v JOIN spray_block b ON b.vineyard_id = v.id WHERE b.id = block_id)::text = current_setting('app.current_org_id', true)`.

### Step 4: Serializers

In `services/api/spray/serializers.py`:

```python
class CaptureInitSerializer(serializers.Serializer):
    """Body for POST /captures/init."""
    kind = serializers.ChoiceField(choices=Capture.Kind.choices)
    mime_type = serializers.CharField(max_length=80)
    size_bytes = serializers.IntegerField(min_value=1, max_value=25 * 1024 * 1024)
    taken_at = serializers.DateTimeField(required=False)

class CaptureSerializer(serializers.ModelSerializer):
    """Read-side; embeds presigned GET URL."""
    download_url = serializers.SerializerMethodField()

    def get_download_url(self, obj):
        if obj.status != Capture.Status.UPLOADED:
            return None
        from spray.imagery import presigned_get_url
        return presigned_get_url(obj.s3_key)

    class Meta:
        model = Capture
        fields = ["id", "block", "kind", "size_bytes", "mime_type",
                  "taken_at", "uploaded_at", "status", "download_url",
                  "created_at"]
        read_only_fields = fields
```

### Step 5: Imagery helper

`services/api/spray/imagery.py` (new):

```python
import boto3
from django.conf import settings

ALLOWED_MIME = {
    "image/jpeg", "image/heic", "image/heif", "video/mp4",
}
MAX_SIZE_BYTES = 25 * 1024 * 1024

def _client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )

def s3_key_for(*, org_id, block_id, capture_id, ext) -> str:
    return f"{org_id}/{block_id}/{capture_id}.{ext}"

def presigned_put_url(s3_key: str, *, mime_type: str, max_size: int) -> dict:
    """Returns a POST policy + signed fields the browser uses to PUT directly to S3."""
    return _client().generate_presigned_post(
        Bucket=settings.IMAGERY_BUCKET,
        Key=s3_key,
        Conditions=[
            {"Content-Type": mime_type},
            ["content-length-range", 1, max_size],
        ],
        Fields={"Content-Type": mime_type},
        ExpiresIn=300,  # 5 min
    )

def presigned_get_url(s3_key: str) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.IMAGERY_BUCKET, "Key": s3_key},
        ExpiresIn=300,
    )

def head_object(s3_key: str) -> dict | None:
    """Returns S3 metadata if the object exists, else None."""
    try:
        return _client().head_object(
            Bucket=settings.IMAGERY_BUCKET, Key=s3_key
        )
    except _client().exceptions.NoSuchKey:
        return None
    except Exception:
        return None
```

`presigned_post` (POST policy) is more browser-friendly than a raw `presigned_put_url` because it lets us enforce `Content-Type` + size limits server-side via the policy doc — the browser can't lie about the file type.

### Step 6: API endpoints

In `services/api/spray/views.py`:

```python
class CaptureInitView(APIView):
    """POST /api/spray/orgs/<org_id>/blocks/<block_id>/captures/init.

    Mints a presigned POST policy + creates a Capture row in `pending`.
    """
    permission_classes = [IsOrgMember]

    @transaction.atomic
    def post(self, request, org_id, block_id):
        set_current_org_id(str(org_id))
        block = get_object_or_404(
            Block.objects.for_org(org_id), id=block_id
        )
        serializer = CaptureInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["mime_type"] not in ALLOWED_MIME:
            return Response(
                {"detail": "unsupported mime type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = {"image/jpeg": "jpg", "image/heic": "heic",
               "image/heif": "heif", "video/mp4": "mp4"}[
                   serializer.validated_data["mime_type"]
               ]
        capture = Capture.objects.create(
            block=block,
            uploader=request.user,
            kind=serializer.validated_data["kind"],
            mime_type=serializer.validated_data["mime_type"],
            size_bytes=serializer.validated_data["size_bytes"],
            taken_at=serializer.validated_data.get("taken_at"),
            s3_key=s3_key_for(
                org_id=org_id, block_id=block_id,
                capture_id=str(uuid.uuid4()), ext=ext,
            ),
        )
        # Update s3_key now that capture has its own UUID.
        capture.s3_key = s3_key_for(
            org_id=org_id, block_id=block_id,
            capture_id=str(capture.id), ext=ext,
        )
        capture.save(update_fields=["s3_key"])

        post_data = presigned_put_url(
            capture.s3_key,
            mime_type=capture.mime_type,
            max_size=MAX_SIZE_BYTES,
        )

        return Response({
            "capture": CaptureSerializer(capture).data,
            "upload": post_data,  # url + fields for the browser to POST
        }, status=status.HTTP_201_CREATED)


class CaptureFinalizeView(APIView):
    """POST /api/spray/orgs/<org_id>/captures/<capture_id>/finalize."""
    permission_classes = [IsOrgMember]

    def post(self, request, org_id, capture_id):
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
        # Refresh size from S3 (browser may have lied via the size_bytes claim).
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
    """GET /api/spray/orgs/<org_id>/captures (filterable by block, status)."""
    permission_classes = [IsOrgViewer]
    # Filters: ?block_id=<uuid>, ?status=uploaded (default uploaded).


class CaptureDetailView(APIView):
    """GET / DELETE /api/spray/orgs/<org_id>/captures/<id>."""
    permission_classes = [IsOrgViewer]
```

URL routes added to `services/api/spray/urls.py`:

| Method | Path | View |
|---|---|---|
| `POST` | `/orgs/<org>/blocks/<block>/captures/init` | `CaptureInitView` |
| `POST` | `/orgs/<org>/captures/<id>/finalize` | `CaptureFinalizeView` |
| `GET` | `/orgs/<org>/captures` | `CaptureListView` |
| `GET` | `/orgs/<org>/captures/<id>` | `CaptureDetailView` |

### Step 7: Schema registry

Three new event schemas under `services/api/spray/schemas/events/capture/`:

- `uploaded/v1.json` — `{capture_id, block_id, kind, s3_key, size_bytes, mime_type, taken_at}`
- `archived/v1.json` — placeholder for M1-10 (not emitted at M1-09 but registers the slot).

### Step 8: Frontend — `<CaptureUploader />` component

`apps/web/components/spray/CaptureUploader.tsx` (client component):

- Drag-drop area or `<input type="file" multiple accept="image/jpeg,image/heic,image/heif,video/mp4">`.
- Per-file flow:
  1. Read file, compute `taken_at` from EXIF if present.
  2. POST `/api/spray/orgs/<org>/blocks/<block>/captures/init` with `kind`, `mime_type`, `size_bytes`.
  3. Receive `{capture, upload: {url, fields}}`.
  4. Build a `FormData` with the policy fields + the file as `file`.
  5. POST directly to `upload.url` (S3) with progress event tracking.
  6. On `204 No Content` from S3, POST `/api/spray/orgs/<org>/captures/<capture_id>/finalize`.
  7. On finalize success, push the new Capture into the parent's list.
- Errors at any step: surface inline with retry button. Failed init / failed finalize / S3 4xx → display the response body.

### Step 9: Frontend — vineyard detail integration

In `apps/web/app/spray/(app)/vineyards/[vineyard_id]/page.tsx`'s `BlockEditor` side panel, add a `<CaptureUploader />` below the existing fields plus a "Recent captures" thumbnail strip listing the most recent 5 captures for the block (fetched via `GET /api/spray/orgs/<org>/captures?block_id=<id>`).

### Step 10: Frontend — captures index page

`apps/web/app/spray/(app)/captures/page.tsx` (new): grid of thumbnails, filterable by block + uploaded date range. Click → modal showing the full image + capture metadata.

### Step 11: Tests

Backend:
- `test_capture_models.py` — Capture lifecycle (pending → uploaded → archived), S3 key uniqueness, OrgScopedManager via traversal.
- `test_capture_init.py` — RBAC, mime-type validation, size-limit validation, presigned POST policy fields present.
- `test_capture_finalize.py` — RBAC, idempotent on already-uploaded, 409 if S3 HEAD fails, emits `capture.uploaded` event with correct payload.
- `test_capture_list.py` — filters by block, by status, RBAC denial across orgs.
- `test_imagery_helpers.py` — S3 key path correctness, presigned URL shape (against moto-mocked S3).

Frontend:
- `__tests__/capture-uploader.test.tsx` — mount, drag-drop simulated, mocks fetch sequence (init → S3 PUT → finalize).
- `__tests__/captures-page.test.tsx` — list renders thumbnails, filter dropdown updates the API call.

### Step 12: Runbook + CHANGELOG + plan-doc

- `docs/runbooks/m1-09-imagery-bucket.md` — AWS imagery bucket setup, CORS policy JSON, IAM policy, env var rotation, debugging upload failures.
- CHANGELOG.md M1-09 entry.
- CODEBASE_PLAN.md PR #9 row updated.

### Step 13: Verification before merge

- [ ] Manual E2E on Vercel preview:
  - [ ] Vineyard detail → select a block → drag a JPG into the uploader.
  - [ ] Network tab: `POST /captures/init` returns 201 with `upload.url`.
  - [ ] Network tab: `POST <s3 url>` returns 204.
  - [ ] Network tab: `POST /captures/<id>/finalize` returns 200 with `status: uploaded` + `download_url`.
  - [ ] Thumbnail renders in the side panel via the signed download URL.
  - [ ] Reload page; thumbnail still renders (URL re-mints on each load).
  - [ ] Try a >25 MB file: server returns 400 at init, OR S3 returns 400 at PUT (policy enforces).
  - [ ] Try a bad MIME (e.g. PNG): server returns 400 at init.
- [ ] Cross-org leak check: try `GET /api/spray/orgs/<other-org>/captures/<id>` → 403/404.
- [ ] CI: build, lint, type-check, vitest, pytest, schema-registry-check all green.
- [ ] CHANGELOG + plan-doc rows updated.

## 5. Rollback plan

| Symptom | Fix |
|---|---|
| S3 CORS rejects browser PUT | Update bucket CORS policy with the actual deployed domain. Documented in runbook. |
| `Capture.status` stuck at `pending` for many rows | Add a Celery beat task in M1-09a that flips rows older than 1 hour to `failed`. (Out of scope for M1-09; M1-10 sweeps as part of ML inference dispatch.) |
| Browser sends a fake `mime_type` to skip validation | The presigned POST policy enforces Content-Type at the S3 level; mismatched type → 403 from S3. Server-side `head_object` in finalize verifies size. |
| Signed URL leaks via referrer | URLs expire in 5 min; even leaked, they're useless after that window. M0-08 will add a short-lived OIDC token gating model when full audit lands. |

## 6. Risks introduced

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R49** (NEW) | Browser uploads succeed but finalize never fires (user closes tab) → orphaned S3 objects | Medium | Low | Capture rows in `pending` get reaped at 1h; orphaned S3 objects cleaned by a lifecycle rule (M0-08). |
| **R50** (NEW) | S3 imagery bucket cost balloons (M1-09 doesn't transcode HEIC; large originals stored) | Low | Low | 25 MB cap per file × low N at M1 = trivial cost. M1-10 adds a JPEG thumbnail derivative; original stays cold. |
| **R51** (NEW) | Cross-org capture access via guessed UUID | Low | High | OrgScopedManager + RLS policy + presigned URL minted only after permission check. Three layers. |
| **R52** (NEW) | Long-lived AWS credentials with broader bucket access | Low | Medium | Same wart as M0-04. M0-08 IAM-role swap covers both buckets. |
| **R53** (NEW) | Browsers other than Safari can't preview HEIC inline | Medium | Low | Document in runbook; M1-10 transcodes to JPEG thumbnail for previews; original kept HEIC for ML pipeline. |

## 7. Out of scope (deferred)

- Cloud ML inference (severity grading) — **M1-10**.
- User correction loop — **M1-11**.
- Multi-photo cluster aggregation — **M1-10**.
- HEIC → JPEG thumbnail transcoding — **M1-10**.
- iOS native capture + offline buffering — **M2**.
- Capture archive/delete user UI — **M1-10**.
- Lifecycle rule for orphaned S3 objects — **M0-08** (security hardening).
- Image moderation / content scan — **M0-08**.

## 8. Effort estimate

| Step | Effort |
|---|---|
| 1 plan | 0 (this file) |
| 2 model | 0.5h |
| 3 migration + RLS policy | 0.5h |
| 4 serializers | 0.5h |
| 5 imagery helper | 0.75h |
| 6 API endpoints | 1.5h |
| 7 schema registry | 0.25h |
| 8 CaptureUploader component | 1.5h |
| 9 vineyard detail integration | 0.5h |
| 10 captures index page | 1h |
| 11 tests | 1.5h |
| 12 runbook + CHANGELOG | 0.5h |
| 13 verification | 0.5h |
| **Total** | **~9h** |

## 9. Open questions for Benson

1. **Bucket creation timing.** Default: I assume you'll create `graft-spray-imagery-dev` before the implementation PR merges, similar to how M0-04 staged the lake bucket. Override if you want to defer (the implementation can ship; uploads will fail with a 500 until the bucket exists).
2. **Photo vs video at M1-09.** Spec covers both. Default: ship photos (jpeg/heic/heif). Video (mp4) requires a larger size cap, transcoding pipeline, and longer presigned URLs — I'd defer video to M1-10 with the ML inference work. Override if you want video at M1-09.
3. **Captures page UX.** Default: simple grid with thumbnails + filter dropdown. Override if you want a richer view (Lightroom-style filmstrip, tag editor, etc.) — those are M2+ scope per spec §6.
4. **Default consent on training use.** Per spec §19, the `photo_for_training` consent flag controls whether the capture goes into the ML training corpus. Default at M1-09: respect whatever the user toggled in onboarding (off by default = captures NOT included in training). Override if you want a per-capture toggle.

If silent on all four, defaults apply.

## 10. Strategist's frame (for the record)

This PR is the second leg of the Strategist-recommended triad (M0-06 weather → **M1-09 capture** → M1-10 cloud inference → M1-12 recommendations) that gives a Napa beta grower the visible loop before Benson's Moelis blackout June 1. Capture upload is the most user-visible feature in the entire roadmap. After M1-09, M1-10 (ML inference) is the next critical path; M1-07 + M1-08 (disease engines) and M1-12 (recommendations) round out the demo.

## 11. Dependencies for downstream PRs

- **M1-10 (cloud ML inference)** depends on the `Capture` model + `capture.uploaded` event from this PR.
- **M1-11 (correction loop)** depends on M1-10's `MLPrediction` rows.
- **M1-12 (recommendations)** depends on Capture severity + risk index outputs.
- **M2 mobile capture** ports the upload flow to React Native; the API contract from this PR is stable.
