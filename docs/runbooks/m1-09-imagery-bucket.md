# M1-09 Runbook — Imagery Bucket Setup

Manual operations Benson handles around merging M1-09 to `graft-spray/main`.

## 1. Create the imagery S3 bucket

1. AWS Console → S3 → **Create bucket**
2. Name: `graft-spray-imagery-dev`
3. Region: **US West (Oregon) us-west-2**
4. Block ALL public access: **on**
5. Bucket Versioning: **Enable**
6. Default encryption: **SSE-S3** (matches the lake bucket; M0-08 swaps to a dedicated CMK)
7. Click **Create bucket**

## 2. CORS policy

Browser uploads PUT directly to S3 — they need CORS allowed for the deploy origins.

1. Open the new bucket → **Permissions** tab → scroll to **Cross-origin resource sharing (CORS)** → **Edit**
2. Paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["POST", "PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://graftsystems.com",
      "https://*.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Save changes**.

## 3. Extend the IAM policy

The existing `graft-spray-worker` IAM user (created in M0-04) needs S3 access to the new bucket.

1. AWS Console → IAM → Users → `graft-spray-worker` → click into the attached `graft-spray-lake-rw` policy
2. **Edit policy** → JSON tab → extend the `Resource` array:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::graft-spray-lake-dev",
        "arn:aws:s3:::graft-spray-lake-dev/*",
        "arn:aws:s3:::graft-spray-imagery-dev",
        "arn:aws:s3:::graft-spray-imagery-dev/*"
      ]
    }
  ]
}
```

3. **Save changes**.

## 4. Render env vars

Add to BOTH services so the Django API can mint presigned URLs and the worker (future M1-10 ML inference) can read images:

### `graftwebsite` (API)

| Key | Value |
|---|---|
| `IMAGERY_BUCKET` | `graft-spray-imagery-dev` |
| `AWS_REGION` | `us-west-2` (already set) |

`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` should already exist from M0-04 — confirm they're set.

### `graft-spray-worker`

Same `IMAGERY_BUCKET` and `AWS_REGION`. (Worker doesn't actually use these at M1-09 since no ML inference is wired yet, but setting them now means M1-10 deploy is a no-op on env config.)

## 5. Smoke test

Open the Vercel preview after merge, sign in, navigate to a vineyard with at least one block, click into the block. Below the block-edit fields you should see a **"Drop photos or click to upload"** drop zone.

Drop a JPG. Watch the network tab:

1. `POST /api/spray/orgs/<org>/blocks/<block>/captures/init` → **201**
2. `POST https://graft-spray-imagery-dev.s3.us-west-2.amazonaws.com/...` → **204**
3. `POST /api/spray/orgs/<org>/captures/<id>/finalize` → **200** with `status: uploaded` + `download_url`

Then navigate to **/spray/captures** in the sidebar. The thumbnail should render via the presigned GET URL.

If any step fails:
- 403 on the S3 PUT → CORS policy not applied or origin not in `AllowedOrigins`
- 503 on init → AWS keys missing or wrong region; check `IMAGERY_BUCKET` env var
- 409 on finalize → S3 PUT didn't actually land; re-check CORS

## 6. Production bucket (when ready)

For real users, create `graft-spray-imagery-prod` (same recipe, distinct name) and update `IMAGERY_BUCKET` on the production environment.

## 7. Rollback

If captures are corrupting the bucket or leaking across orgs:

1. Render → `graftwebsite` → Environment → unset `IMAGERY_BUCKET` (or set to `_disabled`)
2. The next API restart, all init calls return 503; no new uploads possible
3. Investigate, fix, re-set the env var

The presigned URLs already minted before the unset stay valid for their 5-min TTL but can't be re-issued.
