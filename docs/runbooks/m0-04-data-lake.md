# M0-04 Runbook — Data Lake Ingest

Manual operations Benson handles around merging M0-04 to `graft-spray/main`.

## 1. AWS account + S3 bucket

If `graftsystems@gmail.com` doesn't already own an AWS account, sign up at https://aws.amazon.com. Free tier is fine through M1.

### Create the dev bucket

1. AWS Console → S3 → **Create bucket**
2. Name: `graft-spray-lake-dev` (must be globally unique; if taken, append a random suffix)
3. Region: **US West (Oregon) us-west-2**
4. Block ALL public access: **on** (default)
5. Bucket Versioning: **Enable**
6. Default encryption: **Server-side encryption with AWS Key Management Service keys (SSE-KMS)** with the AWS managed key (`aws/s3`)
7. Click **Create bucket**

### Create the IAM user

1. AWS Console → IAM → **Users** → **Add user**
2. Name: `graft-spray-worker`
3. Access type: **Programmatic access** (no console login)
4. Attach policy directly → click **Create policy** in a new tab
5. JSON tab, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::graft-spray-lake-dev",
        "arn:aws:s3:::graft-spray-lake-dev/*"
      ]
    }
  ]
}
```

6. Name: `graft-spray-lake-rw`. Save.
7. Back on the user creation page, attach `graft-spray-lake-rw`.
8. Finish creation. **Copy the Access Key ID and Secret Access Key** — you'll paste them into Render in step 3.

## 2. Render Redis

1. Render dashboard → **New +** → **Key Value**
2. Name: `graft-spray-redis`
3. Region: same as your API (Oregon)
4. Plan: **Starter** ($10/mo)
5. Maxmemory policy: `noeviction` (default is fine)
6. Click **Create**
7. After provisioning, copy the **Internal Redis URL** (starts with `redis://red-...:6379`). Used in step 3.

## 3. Render Background Worker

1. Render dashboard → **New +** → **Background Worker**
2. Connect the GraftWebsite repo
3. Branch: `main` (auto-deploys at milestone closeout)
4. Root directory: `services/worker`
5. Build command: `pip install -r requirements.txt`
6. Start command: `celery -A graft_worker worker -B -l info --concurrency=2`
7. Plan: **Starter** ($7/mo)
8. **Environment Variables** (add these before first deploy):

| Key | Value |
|---|---|
| `DATABASE_URL` | Same Internal Database URL as the API service |
| `CELERY_BROKER_URL` | The Internal Redis URL from step 2 |
| `AWS_ACCESS_KEY_ID` | From step 1's IAM user |
| `AWS_SECRET_ACCESS_KEY` | From step 1's IAM user |
| `LAKE_BUCKET` | `graft-spray-lake-dev` (or `-prod` once that exists) |
| `AWS_REGION` | `us-west-2` |
| `DJANGO_SECRET_KEY` | Same as the API service |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | not strictly required for the worker, but Django's check fails without it. Set to `*` |

9. Click **Create**.

## 4. Smoke test after first deploy

From the worker service's Render shell:

```sh
python manage.py forward_now
```

Should print `forwarded N events`. Then check the S3 bucket — there should be at least one Parquet file under `<some-org-uuid>/<category>/<date>/<batch-uuid>.parquet`.

## 5. Production bucket (when ready)

When ready to ship to real users:

1. Repeat step 1 with bucket name `graft-spray-lake-prod`
2. Update the IAM policy's Resource ARNs to include the prod bucket
3. Update `LAKE_BUCKET` env var on the worker to `graft-spray-lake-prod`
4. Trigger a manual redeploy on the worker

## 6. Monitoring (deferred to M0-08)

For now, Render's process logs are the only visibility. M0-08 wires Sentry + a backlog-age alert (`MAX(created_at - forwarded_at) > 1 hour`).

To check backlog manually:

```sh
# From the API service's Render shell:
python manage.py shell
>>> from spray.models import DataLakeEvent
>>> DataLakeEvent.objects.unscoped().filter(forwarded_at__isnull=True).count()
```

Should be near zero in steady state.

## 7. Rollback

If the worker is misbehaving and corrupting data:

1. Render dashboard → worker service → **Suspend service** (stops new task pickups)
2. Investigate via logs / `forward_now` locally with the same env vars
3. Once fixed, redeploy and **Resume**

DataLakeEvent rows in Postgres are unaffected by worker downtime; they accumulate safely until forwarding resumes.
