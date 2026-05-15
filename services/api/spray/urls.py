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
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/sensor-readings",
        views.BlockSensorReadingsView.as_view(),
        name="block_sensor_readings",
    ),
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/forecast-weather",
        views.BlockForecastWeatherView.as_view(),
        name="block_forecast_weather",
    ),
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>",
        views.BlockDetailView.as_view(),
        name="block_detail",
    ),
    path(
        "orgs/<uuid:org_id>/setup-summary",
        views.SetupSummaryView.as_view(),
        name="setup_summary",
    ),
    path(
        "orgs/<uuid:org_id>/dashboard-summary",
        views.DashboardSummaryView.as_view(),
        name="dashboard_summary",
    ),
    path(
        "orgs/<uuid:org_id>/program-settings",
        views.SprayProgramSettingsView.as_view(),
        name="program_settings",
    ),
    path(
        "orgs/<uuid:org_id>/spray-records",
        views.SprayRecordListCreateView.as_view(),
        name="spray_record_list_create",
    ),
    path(
        "orgs/<uuid:org_id>/spray-records/<uuid:record_id>",
        views.SprayRecordDetailView.as_view(),
        name="spray_record_detail",
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
    # M1.5 PR-C: Aggregation engine — verdict endpoints.
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/verdicts/latest",
        views.BlockVerdictLatestView.as_view(),
        name="block_verdict_latest",
    ),
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/verdicts",
        views.BlockVerdictListView.as_view(),
        name="block_verdict_list",
    ),
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/verdicts/recompute",
        views.BlockVerdictRecomputeView.as_view(),
        name="block_verdict_recompute",
    ),
    # M1.5 PR-F: Daily brief renderer.
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/verdicts/"
        "<uuid:verdict_id>/brief",
        views.BlockVerdictBriefView.as_view(),
        name="block_verdict_brief",
    ),
    # M1.5 PR-F.5: Audit-log PDF export.
    path(
        "orgs/<uuid:org_id>/blocks/<uuid:block_id>/verdicts/"
        "<uuid:verdict_id>/audit.pdf",
        views.BlockVerdictAuditPdfView.as_view(),
        name="block_verdict_audit_pdf",
    ),
    # M1.5 PR-D: Sensor connector integrations (Pessl FieldClimate).
    path(
        "orgs/<uuid:org_id>/integrations",
        views.IntegrationListView.as_view(),
        name="integration_list",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/pessl/oauth/start",
        views.PesslOAuthStartView.as_view(),
        name="pessl_oauth_start",
    ),
    path(
        "integrations/pessl/oauth/callback",
        views.PesslOAuthCallbackView.as_view(),
        name="pessl_oauth_callback",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/<uuid:conn_id>/stations",
        views.IntegrationStationListView.as_view(),
        name="integration_station_list",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/<uuid:conn_id>/stations/"
        "<uuid:station_id>/link-block",
        views.IntegrationStationLinkBlockView.as_view(),
        name="integration_station_link_block",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/<uuid:conn_id>/stations/"
        "<uuid:station_id>/pull-readings",
        views.IntegrationStationPullReadingsView.as_view(),
        name="integration_station_pull_readings",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/<uuid:conn_id>/purge",
        views.IntegrationPurgeView.as_view(),
        name="integration_purge",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/<uuid:conn_id>",
        views.IntegrationDisconnectView.as_view(),
        name="integration_disconnect",
    ),
    # M1.5 PR-E: Davis + METER paste-key connect + METER push receiver.
    path(
        "orgs/<uuid:org_id>/integrations/davis/connect",
        views.DavisConnectView.as_view(),
        name="davis_connect",
    ),
    path(
        "orgs/<uuid:org_id>/integrations/meter/connect",
        views.MeterConnectView.as_view(),
        name="meter_connect",
    ),
    # Public webhook (no auth; HMAC-validated). Must remain unauthenticated
    # at the middleware level — METER's Push API can't carry a Clerk JWT.
    path(
        "integrations/meter/webhook",
        views.meter_webhook,
        name="meter_webhook",
    ),
]
