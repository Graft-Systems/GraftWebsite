"""Django admin for the Graft Spray app (all tenant + sensor + weather models).

Uses GISModelAdmin where models expose geometry. Encrypted connector tokens
and audit-only rows are read-only or excluded as noted per class.

Theme: django-jazzmin (see ``INSTALLED_APPS`` / ``JAZZMIN_SETTINGS`` in
``graft_api.settings``). Staff UI: ``/admin/`` when ``DEBUG`` or when staff
credentials are configured in production.
"""

from django.contrib import admin
from django.contrib.gis import admin as gis_admin

from spray.managers import OrgScopedManager
from spray.models import (
    AuthEvent,
    Block,
    BlockVerdict,
    Capture,
    ConsentRecord,
    DataLakeEvent,
    ExternalRiskIndex,
    IntegrationConnection,
    Membership,
    OAuthState,
    Org,
    RiskRecord,
    SensorReading,
    SensorStation,
    SensorStationBlock,
    Session,
    SprayRecord,
    User,
    Vineyard,
    WeatherObservation,
    WeatherStation,
)


class UnscopedOrgModelAdminMixin:
    """Django admin lists/changelogs evaluate querysets; org-scoped models must
    call ``.unscoped()`` there (see ``spray.managers.OrgScopedManager``).
    """

    def get_queryset(self, request):
        mgr = self.model._default_manager
        if isinstance(mgr, OrgScopedManager):
            return mgr.unscoped()
        return super().get_queryset(request)


@admin.register(Org)
class OrgAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "plan", "created_at", "archived_at")
    list_filter = ("region", "plan", "archived_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "clerk_user_id", "locale", "created_at", "deleted_at")
    list_filter = ("locale", "deleted_at")
    search_fields = ("email", "name", "clerk_user_id")
    readonly_fields = ("id", "clerk_user_id", "created_at")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "org", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "org__name")
    readonly_fields = ("id", "created_at")


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = (
        "clerk_session_id",
        "user",
        "device",
        "ip",
        "created_at",
        "last_seen_at",
        "revoked_at",
    )
    list_filter = ("revoked_at",)
    search_fields = ("user__email", "clerk_session_id", "ip")
    readonly_fields = ("id", "clerk_session_id", "jwt_jti", "created_at")


@admin.register(AuthEvent)
class AuthEventAdmin(admin.ModelAdmin):
    list_display = ("type", "outcome", "user", "org", "ip", "created_at")
    list_filter = ("type", "outcome")
    search_fields = ("user__email", "org__name", "ip")
    readonly_fields = (
        "id",
        "user",
        "org",
        "type",
        "outcome",
        "ip",
        "user_agent",
        "metadata",
        "created_at",
    )

    def has_add_permission(self, request) -> bool:
        # Audit log is insert-only via application code, never via admin.
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        # Audit log is immutable.
        return False


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "granted", "granted_at", "withdrawn_at")
    list_filter = ("category", "granted")
    search_fields = ("user__email",)
    readonly_fields = ("id",)


# M0-03: Vineyard / Block / DataLakeEvent. Vineyard + Block use the GIS
# admin so the centroid / geom columns render with a Leaflet OSM widget.


@admin.register(Vineyard)
class VineyardAdmin(UnscopedOrgModelAdminMixin, gis_admin.GISModelAdmin):
    list_display = ("name", "org", "region", "created_at", "archived_at")
    list_filter = ("region", "archived_at")
    search_fields = ("name", "org__name")
    readonly_fields = ("id", "created_at")


@admin.register(Block)
class BlockAdmin(UnscopedOrgModelAdminMixin, gis_admin.GISModelAdmin):
    list_display = ("name", "vineyard", "variety", "created_at", "archived_at")
    list_filter = ("variety", "archived_at")
    search_fields = ("name", "vineyard__name", "variety")
    readonly_fields = ("id", "created_at")


@admin.register(SprayRecord)
class SprayRecordAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = ("product", "block", "target_disease", "applied_at", "archived_at")
    list_filter = ("target_disease", "archived_at")
    search_fields = ("product", "block__name", "block__vineyard__name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(DataLakeEvent)
class DataLakeEventAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = ("category", "schema_version", "org", "user", "created_at")
    list_filter = ("category", "schema_version")
    search_fields = ("category", "org__name")
    readonly_fields = (
        "id",
        "org",
        "user",
        "category",
        "schema_version",
        "payload",
        "created_at",
    )

    def has_add_permission(self, request) -> bool:
        # Lake events are emitted by application code; admin is read-only.
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


# ---------------------------------------------------------------------
# Weather + external risk (M0-06, SA-1)
# ---------------------------------------------------------------------


@admin.register(WeatherStation)
class WeatherStationAdmin(gis_admin.GISModelAdmin):
    list_display = (
        "name",
        "provider",
        "station_id",
        "org",
        "region",
        "is_regional_default",
        "last_pull_at",
        "created_at",
    )
    list_filter = ("provider", "region", "is_regional_default")
    search_fields = ("name", "station_id", "org__name")
    readonly_fields = ("id", "created_at")


@admin.register(WeatherObservation)
class WeatherObservationAdmin(admin.ModelAdmin):
    list_display = ("station", "ts", "temp_c", "rh_pct", "is_forecast")
    list_filter = ("is_forecast",)
    search_fields = ("station__station_id", "station__name")
    date_hierarchy = "ts"
    readonly_fields = ("id",)
    raw_id_fields = ("station",)


@admin.register(ExternalRiskIndex)
class ExternalRiskIndexAdmin(admin.ModelAdmin):
    list_display = (
        "region",
        "source",
        "risk_level",
        "risk_index_value",
        "pulled_at_hour",
    )
    list_filter = ("source", "risk_level")
    search_fields = ("region",)
    readonly_fields = ("id", "pulled_at")


# ---------------------------------------------------------------------
# Captures + aggregation + verdicts
# ---------------------------------------------------------------------


@admin.register(Capture)
class CaptureAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = (
        "block",
        "kind",
        "status",
        "uploader",
        "uploaded_at",
        "created_at",
    )
    list_filter = ("kind", "status")
    search_fields = ("s3_key", "block__name", "block__vineyard__name")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("block", "uploader")


@admin.register(RiskRecord)
class RiskRecordAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = (
        "block",
        "model_id",
        "pathogen",
        "severity_1_10",
        "valid_from",
        "created_at",
    )
    list_filter = ("pathogen", "model_id")
    search_fields = ("block__name", "model_id", "input_snapshot_id")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("block",)


@admin.register(BlockVerdict)
class BlockVerdictAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = (
        "block",
        "date",
        "action",
        "urgency",
        "powdery_severity_1_10",
        "downy_severity_1_10",
        "generated_at",
    )
    list_filter = ("action", "urgency")
    search_fields = ("block__name", "audit_hash")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("block",)


# ---------------------------------------------------------------------
# Sensor integrations (M1.5 PR-D)
# ---------------------------------------------------------------------


@admin.register(IntegrationConnection)
class IntegrationConnectionAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = (
        "org",
        "vendor",
        "vendor_account_id",
        "status",
        "connected_at",
        "last_health_at",
    )
    list_filter = ("vendor", "status")
    search_fields = ("org__name", "vendor_account_id")
    readonly_fields = ("id", "connected_at", "token_ciphertext_length")
    exclude = ("token_ciphertext",)

    @admin.display(description="Token size (bytes)")
    def token_ciphertext_length(self, obj: IntegrationConnection) -> int:
        if obj.pk and obj.token_ciphertext:
            return len(bytes(obj.token_ciphertext))
        return 0

    def has_add_permission(self, request) -> bool:
        # Encrypted tokens are provisioned via the Spray API, not hand-entered.
        return False


@admin.register(SensorStation)
class SensorStationAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = (
        "name",
        "connection",
        "vendor_station_id",
        "last_seen_at",
        "archived_at",
    )
    list_filter = ("archived_at",)
    search_fields = ("name", "vendor_station_id", "connection__vendor_account_id")
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("connection",)


@admin.register(SensorStationBlock)
class SensorStationBlockAdmin(admin.ModelAdmin):
    list_display = ("station", "block", "linked_by", "linked_at")
    search_fields = ("station__vendor_station_id", "block__name")
    readonly_fields = ("id", "linked_at")
    raw_id_fields = ("station", "block", "linked_by")


@admin.register(SensorReading)
class SensorReadingAdmin(UnscopedOrgModelAdminMixin, admin.ModelAdmin):
    list_display = ("station", "ts", "air_temp_c", "rh_pct", "quality_flag")
    list_filter = ("quality_flag",)
    search_fields = ("station__vendor_station_id",)
    date_hierarchy = "ts"
    readonly_fields = ("id", "created_at")
    raw_id_fields = ("station",)


@admin.register(OAuthState)
class OAuthStateAdmin(admin.ModelAdmin):
    list_display = ("vendor", "org", "state_prefix", "created_at", "expires_at", "consumed_at")
    list_filter = ("vendor",)
    search_fields = ("org__name", "state")
    readonly_fields = ("id", "state", "created_at")

    @admin.display(description="State (prefix)")
    def state_prefix(self, obj: OAuthState) -> str:
        return f"{obj.state[:12]}…" if obj.state else ""
