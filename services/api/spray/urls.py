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
]
