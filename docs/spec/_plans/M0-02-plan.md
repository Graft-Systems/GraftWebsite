# M0-02 Plan — Account & Identity (Clerk)

**Status:** PLAN ONLY. No implementation code in this commit. Implementation begins only after Benson approves.
**Branch:** `graft-spray/m0/auth-identity`
**PR target:** `graft-spray/main`
**Depends on:** PR #5 (M0-01 monorepo bootstrap) merged first. This branch was forked from `graft-spray/m0/repo-bootstrap`; once PR #5 squash-merges into `graft-spray/main`, this branch will be rebased onto the new tip so the PR diff shows only M0-02 changes.
**Spec section reference:** [`Graft-Spray-App-Spec.md` §20](../Graft-Spray-App-Spec.md), [`CODEBASE_PLAN.md` §6 PR #2](../CODEBASE_PLAN.md), Open Question Q8 (Clerk) RESOLVED, Q5 (subpath routing) RESOLVED.
**Estimated diff size:** Medium-Large.
**Estimated effort:** 6 to 9 hours of implementation work, plus ~30 min of Benson's time on Clerk dashboard setup.

---

## 1. Goal

Stand up the foundation of Graft Spray's identity layer. After this PR lands:

- Clerk hosts the signup, login, password-reset, MFA, and Sign-in-with-Apple flows for `apps/web`.
- A new `spray` Django app under `services/api/` owns the multi-tenant data model: `Org`, `User`, `Membership`, `Session`, `AuthEvent`, `ConsentRecord`.
- Clerk webhooks sync the canonical `User` record on user-created / user-updated / user-deleted events.
- A custom DRF authentication class validates Clerk JWTs and resolves the active `Org` and `Membership` per request.
- DRF permission classes enforce the four roles (Owner, Admin, Member, Viewer) at every endpoint.
- The marketing nav reflects auth state (avatar+menu when logged in, "Log in" when logged out).
- An in-app account-deletion endpoint with two-step confirmation satisfies Apple App Review Guideline 5.1.1(v) ahead of M2 submission.
- Every authentication event (login, logout, MFA enable/disable, password change, role change, account deletion) records an immutable `AuthEvent` row.

This PR does NOT yet build the Spray app shell, the `/spray` marketing landing, or the post-login `(spray)` route group. Those are M0-02a (a separate PR after this one).

## 2. Decisions locked from CODEBASE_PLAN open questions

| Q | Resolution | Affects |
|---|---|---|
| Q5 | Subpath routing `graftsystems.com/spray/*`. | Auth callback URLs, post-login routing destinations (M0-02a uses these). |
| Q8 | Clerk (not Auth0). | All auth implementation. |
| Q9 | `.gitattributes` LF policy already landed in M0-01. | Affects all new files; nothing extra to do. |
| Q14 | Free tier across the board. | Clerk free tier (10,000 MAU) is sufficient through M2; document upgrade path in section 8. |

## 3. Pre-flight checklist

These must be captured / confirmed before merge.

| Check | Owner | Notes |
|---|---|---|
| Clerk account / org provisioned for graftsystems.com | Benson | Decide: new Clerk org dedicated to Graft Spray, or reuse an existing one. Recommend NEW for clean tenancy. |
| Clerk publishable key generated | Benson | Lands in Vercel env as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. |
| Clerk secret key generated | Benson | Lands in Render env as `CLERK_SECRET_KEY`. |
| Clerk webhook signing secret generated | Benson | Lands in Render env as `CLERK_WEBHOOK_SIGNING_SECRET`. |
| Clerk webhook endpoint registered | Benson + Builder | URL: `https://graft-api.onrender.com/api/spray/clerk/webhook`. Events: `user.created`, `user.updated`, `user.deleted`, `session.created`, `session.removed`. |
| Sign in with Apple configured in Clerk | Benson | Required for M2 App Store submission per Apple Guideline 4.8. Web supports it now via Clerk's hosted UI. Apple Developer account team ID needed (Q13 still partial; can defer Sign in with Apple config to M2 if needed and just enable email + Google OAuth at M0-02). |
| MFA (TOTP) enabled in Clerk dashboard | Benson | Required for Owner role per spec §20.2. |

**Decision needed before Step 4:** does Sign in with Apple configure now (M0-02) or wait for M2 (when Q13 fully resolves)? Recommend wait — emails + Google OAuth are sufficient for M0-M1 web launch.

## 4. Migration steps

Each step is a separate commit with a Conventional Commit message.

### Step 1: Create the `spray` Django app

```bash
cd services/api
python manage.py startapp spray
```

- Add `'spray'` to `graft_api/settings.py` `INSTALLED_APPS`.
- Add `path("api/spray/", include("spray.urls"))` to `graft_api/urls.py`.

### Step 2: Define the auth + tenancy models

`services/api/spray/models.py`:

- `Org`: id (uuid), name, region (enum: napa, sonoma, burgundy, bordeaux, mendoza, other), plan (free / pro), settings (jsonb), created_at, archived_at.
- `User`: id (uuid), clerk_user_id (unique, indexed), email, phone (nullable), name, locale (default `en`), created_at, deleted_at.
- `Membership`: id (uuid), org_id (FK), user_id (FK), role (enum: OWNER, ADMIN, MEMBER, VIEWER), created_at. Unique constraint on (org_id, user_id).
- `Session`: id (uuid), user_id (FK), jwt_jti, device, ip, user_agent, created_at, last_seen_at, revoked_at (nullable).
- `AuthEvent`: id (uuid), user_id (FK, nullable for unauthenticated events), org_id (FK, nullable), type (enum: see §20.8 of spec), ip, user_agent, outcome (success / failure), metadata (jsonb), created_at. Indexed on (user_id, created_at).
- `ConsentRecord`: id (uuid), user_id (FK), category (enum: photo_for_training, spray_records_for_benchmarks, anonymized_aggregates, marketing_email), granted (bool), granted_at, withdrawn_at (nullable). Unique constraint on (user_id, category).

Run migrations:

```bash
python manage.py makemigrations spray
python manage.py migrate
```

Verify: `services/api/spray/migrations/0001_initial.py` lands cleanly.

### Step 3: Custom DRF authentication class

`services/api/spray/auth/clerk.py`:

```python
class ClerkJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Read Authorization: Bearer <token>
        # Validate via Clerk's JWKS endpoint (cached in Redis or in-memory with TTL)
        # Extract clerk_user_id, resolve User row
        # Optionally resolve Membership from request header X-Org-Id
        # Return (user, membership) or raise AuthenticationFailed
```

Set as `DEFAULT_AUTHENTICATION_CLASSES` in `graft_api/settings.py` REST_FRAMEWORK config.

### Step 4: RBAC permission classes

`services/api/spray/permissions.py`:

- `IsAuthenticated`: re-export from DRF.
- `IsOrgMember`: requires `request.membership.org == request.parser_context['kwargs']['org_id']`.
- `IsOrgViewer`: subset of IsOrgMember; allows GET only.
- `IsOrgOwner`: requires `request.membership.role == OWNER`.
- `IsOrgAdmin`: requires `request.membership.role in (OWNER, ADMIN)`.

### Step 5: Clerk webhook handler

`POST /api/spray/clerk/webhook`:

- Validate the Svix signature using `CLERK_WEBHOOK_SIGNING_SECRET`.
- Parse the event type:
  - `user.created`: insert / upsert `User` row. Create no Org by default (user creates their first Org via `POST /api/spray/orgs`).
  - `user.updated`: update `User` row (email, name, phone, locale).
  - `user.deleted`: soft-delete `User` row (sets `deleted_at`); ConsentRecord and Membership cascade per Django ORM behavior; AuthEvent and Session retained for audit.
  - `session.created`: insert `Session` row.
  - `session.removed`: update `Session.revoked_at`.

Idempotent: replays of the same Clerk event don't create duplicate rows (use Clerk's `evt_id` as a deduplication key in a `WebhookEvent` model — minor extra table).

### Step 6: Org and Membership endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `/api/spray/orgs` | `IsAuthenticated` | Caller creates an Org; becomes Owner. MFA must be enabled before completion (server checks Clerk's `two_factor_enabled` claim). |
| `GET` | `/api/spray/orgs/me` | `IsAuthenticated` | List all Orgs the caller is a member of, with role. |
| `GET` | `/api/spray/orgs/:id` | `IsOrgMember` | Return Org details. |
| `PATCH` | `/api/spray/orgs/:id` | `IsOrgAdmin` | Update name, region, settings. |
| `DELETE` | `/api/spray/orgs/:id` | `IsOrgOwner` | Archive Org (sets `archived_at`); does NOT delete data. |
| `POST` | `/api/spray/orgs/:id/invite` | `IsOrgAdmin` | Invite a User by email; integrates with Clerk's invitations API. |
| `GET` | `/api/spray/orgs/:id/memberships` | `IsOrgMember` | List members + roles. |
| `PATCH` | `/api/spray/orgs/:id/memberships/:user_id` | `IsOrgOwner` | Change role. Cannot demote the last Owner. |
| `DELETE` | `/api/spray/orgs/:id/memberships/:user_id` | `IsOrgOwner` | Remove member. |

Each write emits an `AuthEvent` row.

### Step 7: Account lifecycle endpoints

- `POST /api/spray/account/delete` — initiates account deletion. Two-step: first call sets `deletion_requested_at` and emails confirmation; second call (with email-token) executes. Operational data deleted immediately; lake-data purge queued (per spec §19, cascades to a 30-day SLA).
- `POST /api/spray/account/export` — initiates JSON + photo-zip export per spec §16.2; returns `job_id` (Celery task in M0-04 once worker tier exists, sync stub at M0-02).
- `GET /api/spray/account/export/:job_id` — status + download URL when ready.

### Step 8: Frontend Clerk integration (apps/web)

- `pnpm --filter @graft/web add @clerk/nextjs`.
- `apps/web/middleware.ts` — Clerk middleware protects `/spray/*` routes; passes through marketing routes.
- `apps/web/app/layout.tsx` — wrap with `<ClerkProvider>`.
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` — Clerk hosted SignIn component.
- `apps/web/app/sign-up/[[...sign-up]]/page.tsx` — Clerk hosted SignUp component.
- `apps/web/components/layout/Nav.tsx` — show `<UserButton>` when signed in, "Log in" link when not.

### Step 9: Consent toggles + onboarding seed

`apps/web/app/(spray)/onboarding/page.tsx` — minimal placeholder page (M0-02a expands). Includes:

- Per-category consent toggles (per spec §19): `photo_for_training`, `spray_records_for_benchmarks`, `anonymized_aggregates`. Each toggle calls `POST /api/spray/account/consent` to upsert a ConsentRecord row.
- Stub "Create Org" form (real wizard lands in M0-02a).

### Step 10: Tests

`services/api/spray/tests/`:

- `test_models.py` — model defaults, unique constraints, role enum.
- `test_clerk_auth.py` — JWT validation against a mock JWKS; expired tokens rejected; unknown clerk_user_id rejected.
- `test_permissions.py` — RBAC: Owner can do everything in their Org; Admin can manage memberships but not delete Org; Member can read but not change roles; Viewer is read-only.
- `test_webhook.py` — Svix signature validation; idempotent replay; user.created creates User; user.deleted soft-deletes.
- `test_org_endpoints.py` — happy path + RBAC denial cases for each endpoint.
- `test_account_delete.py` — two-step deletion; AuthEvent recorded.

### Step 11: Verification before merge

- [ ] `python manage.py migrate` runs cleanly on a fresh DB.
- [ ] `pytest services/api/spray/tests/` all green.
- [ ] `pnpm --filter @graft/web build` succeeds.
- [ ] Manual E2E in dev: signup → email verify → org create → log out → log in works.
- [ ] Clerk webhook fires on user.created and the User row appears in Postgres.
- [ ] CHANGELOG.md updated with M0-02 entry.
- [ ] CODEBASE_PLAN.md and CLAUDE_CODE_PLAN.md acceptance-criteria updated.

## 5. Rollback plan

If anything breaks after merge:

1. **Revert env vars**: in Vercel, remove `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Frontend re-renders without ClerkProvider; marketing pages keep working. In Render, remove `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET`. Backend's auth class will reject all Spray API calls (which is desired if rolling back).
2. **Disable webhook in Clerk dashboard**: stops user-create events from hitting the broken backend.
3. **Revert PR #6 squash-merge** on `graft-spray/main` via `git revert -m 1 <sha>`. The new tables are now empty; safe to drop in a follow-up if desired.
4. The marketing site keeps working throughout (Clerk middleware is opt-in per route).

## 6. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| **R21** (NEW) | Clerk free-tier MAU limit (10,000) | Low | Sufficient through M2. Document upgrade path. Alert at 80% usage via Sentry. |
| **R22** (NEW) | Clerk webhook signature validation bypass | High | Step 5 mandates Svix signature verification before any DB write. Tests in Step 10. |
| **R23** (NEW) | Clerk secret key leakage | High | Render secret store; rotate quarterly per CODEBASE_PLAN §10. Never commit. |
| **R24** (NEW) | Race condition: webhook arrives before frontend completes signup | Low | Webhook handler is idempotent; if User row already exists, skip. |
| **R25** (NEW) | Apple Sign in deferred to M2 | Low | Decision in §3 pre-flight. Document in CHANGELOG as known limitation. |
| R6 (cache) | Per-process auth cache invalidation under multi-worker | Medium | Use short JWT cache TTL (60s) so revocations propagate within 60s. |

## 7. Acceptance criteria

See Step 11.

## 8. Open questions

- **Q for Benson before approval:** new Clerk org or reuse existing? (Recommend NEW.)
- **Q for Benson before approval:** confirm Clerk free tier is acceptable (10K MAU). Upgrade path: Clerk Pro at $25/mo per 1,000 MAU above free.
- **Q for Benson before approval:** defer Sign in with Apple to M2, or configure now? (Recommend defer; web is fine with email + Google.)

## 9. What this PR is NOT

- Not the `/spray` marketing landing page (that is M0-02a).
- Not the authenticated `(spray)` app shell (M0-02a).
- Not the data lake schema (M0-04).
- Not the recommendation engine, capture upload, or any Spray-specific business logic. Those are M1.

This PR is the foundation of the identity layer. Subsequent PRs ride on it.

---

## Approval

This PR contains the **plan only**. No implementation code yet. **Awaiting Benson's approval to proceed with Steps 1 through 11.**

When you approve, I will execute the steps in order, committing each as a separate Conventional Commit on this branch, then squash-merge into `graft-spray/main` after the verification checklist in §4.11 passes.

Three small confirmations needed before Step 1:

1. New Clerk org or existing? (Recommend NEW.)
2. Free tier confirmed?
3. Sign in with Apple now or M2? (Recommend M2.)

Drop a comment on PR #6 with answers and a "go" and I start cooking.
