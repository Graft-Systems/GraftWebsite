# Render Environment Variable Sync

Use `scripts/render-env-sync` to push non-empty values from a local env file to Render.

The default env file is:

```bash
/Users/bensonklein/Desktop/graft-systems-spray-env-template.txt
```

Dry run:

```bash
scripts/render-env-sync --service website
scripts/render-env-sync --service worker
```

Apply:

```bash
scripts/render-env-sync --service website --apply
scripts/render-env-sync --service worker --apply
```

The script never prints secret values. It skips:

- blank values
- comments
- `RENDER_API_KEY`
- Render service IDs, owner IDs, and deploy hook URLs

It uses Render's API endpoint for adding or updating one service env var:

```text
PUT /v1/services/{serviceId}/env-vars/{envVarKey}
```

Source: https://api-docs.render.com/reference/update-env-var

## Graft Spray (website service)

Optional client flag for internal demos: set `NEXT_PUBLIC_SHOW_PROVIDER_HEALTH=true` on the Next.js **website** service to show a read-only JSON panel on `/spray/integrations` that calls `GET /api/spray/admin/provider-health` (requires an authenticated Spray session). Leave unset in production unless operators need it.

