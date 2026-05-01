"""Django admin registrations for the Graft Spray auth/tenancy models.

Visible at /admin/ in DEBUG mode. Read-only-ish for the audit-trail models;
full CRUD for development inspection. Production lockdown lands when
internal-staff-access controls are introduced (spec section 17.6).
"""

from django.contrib import admin

from spray.models import (
    AuthEvent,
    ConsentRecord,
    Membership,
    Org,
    Session,
    User,
)


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
