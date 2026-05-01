from django.urls import path

app_name = "spray"

# Routes land per docs/spec/_plans/M0-02-plan.md sections 4.5, 4.6, 4.7.
# Empty at step 1; populated in subsequent steps:
#
#   - POST /api/spray/clerk/webhook       (step 5)
#   - POST /api/spray/orgs                (step 6)
#   - GET  /api/spray/orgs/me             (step 6)
#   - GET  /api/spray/orgs/<id>           (step 6)
#   - PATCH /api/spray/orgs/<id>          (step 6)
#   - DELETE /api/spray/orgs/<id>         (step 6)
#   - POST /api/spray/orgs/<id>/invite    (step 6)
#   - GET  /api/spray/orgs/<id>/memberships  (step 6)
#   - PATCH /api/spray/orgs/<id>/memberships/<user_id>  (step 6)
#   - DELETE /api/spray/orgs/<id>/memberships/<user_id>  (step 6)
#   - POST /api/spray/account/delete      (step 7)
#   - POST /api/spray/account/export      (step 7)
#   - GET  /api/spray/account/export/<job_id>  (step 7)

urlpatterns: list = []
