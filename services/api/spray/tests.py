# Graft Spray test suite.
#
# Empty at M0-02 step 1. Tests land in step 10 per docs/spec/_plans/M0-02-plan.md:
#
#   - test_models.py         (model defaults, unique constraints, role enum)
#   - test_clerk_auth.py     (JWT validation against mock JWKS)
#   - test_permissions.py    (RBAC: Owner, Admin, Member, Viewer)
#   - test_webhook.py        (Svix signature validation; idempotent replay)
#   - test_org_endpoints.py  (happy path + RBAC denial cases per endpoint)
#   - test_account_delete.py (two-step deletion + AuthEvent recorded)
