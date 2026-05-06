"""URL routing for the Graft Spray Django app.

Mounted at `/api/spray/` by graft_api/urls.py. Routes land per
docs/spec/_plans/M0-02-plan.md sections 4.5, 4.6, 4.7, 4.9.
"""

from django.urls import path

from spray import views

app_name = "spray"

urlpatterns = [
    # Step 5: Clerk webhook ingestion.
    path("clerk/webhook", views.clerk_webhook, name="clerk_webhook"),
    # Step 6: Org and Membership.
    path("orgs", views.OrgCreateView.as_view(), name="orgs_create"),
    path("orgs/me", views.MyOrgsView.as_view(), name="orgs_me"),
    path("orgs/<uuid:org_id>", views.OrgDetailView.as_view(), name="org_detail"),
    path(
        "orgs/<uuid:org_id>/memberships",
        views.OrgMembershipListView.as_view(),
        name="org_memberships",
    ),
    path(
        "orgs/<uuid:org_id>/invite",
        views.OrgInviteView.as_view(),
        name="org_invite",
    ),
    path(
        "orgs/<uuid:org_id>/memberships/<uuid:user_id>",
        views.OrgMembershipDetailView.as_view(),
        name="org_membership_detail",
    ),
    # Step 7: Account lifecycle.
    path(
        "account/delete",
        views.AccountDeleteView.as_view(),
        name="account_delete",
    ),
    path(
        "account/export",
        views.AccountExportView.as_view(),
        name="account_export",
    ),
    # Step 9: Consent toggles.
    path(
        "account/consent",
        views.ConsentView.as_view(),
        name="account_consent",
    ),
    # M0-03: Vineyards + Blocks.
    path(
        "orgs/<uuid:org_id>/vineyards",
        views.VineyardListCreateView.as_view(),
        name="vineyards_list_create",
    ),
    path(
        "orgs/<uuid:org_id>/vineyards/<uuid:vineyard_id>",
        views.VineyardDetailView.as_view(),
        name="vineyard_detail",
    ),
    path(
        "orgs/<uuid:org_id>/vineyards/<uuid:vineyard_id>/blocks",
        views.BlockListCreateView.as_view(),
        name="blocks_list_create",
    ),
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>",
        views.BlockDetailView.as_view(),
        name="block_detail",
    ),
    # M0-06: provider-health admin endpoint.
    path(
        "admin/provider-health",
        views.ProviderHealthView.as_view(),
        name="provider_health",
    ),
    # M1-09: Capture upload.
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/captures/init",
        views.CaptureInitView.as_view(),
        name="capture_init",
    ),
    path(
        "orgs/<uuid:org_id>/captures/<uuid:capture_id>/finalize",
        views.CaptureFinalizeView.as_view(),
        name="capture_finalize",
    ),
    path(
        "orgs/<uuid:org_id>/captures",
        views.CaptureListView.as_view(),
        name="capture_list",
    ),
    path(
        "orgs/<uuid:org_id>/captures/<uuid:capture_id>",
        views.CaptureDetailView.as_view(),
        name="capture_detail",
    ),
]
