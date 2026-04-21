from django.contrib import admin

from .models import ContactSubmission, WaitlistEntry


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "vineyard_size_acres",
        "short_message",
        "email_status",
        "created_at",
    )
    list_filter = ("email_status", "created_at", "vineyard_size_acres")
    search_fields = ("name", "email", "message")
    readonly_fields = (
        "name",
        "email",
        "message",
        "vineyard_size_acres",
        "created_at",
        "email_status",
        "resend_message_id",
        "error_message",
    )
    ordering = ("-created_at",)

    @admin.display(description="Message")
    def short_message(self, obj: ContactSubmission) -> str:
        preview = obj.message.replace("\n", " ").strip()
        return preview[:80] + ("…" if len(preview) > 80 else "")

    def has_add_permission(self, request) -> bool:
        return False


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ("email", "source", "created_at")
    list_filter = ("source", "created_at")
    search_fields = ("email", "source")
    readonly_fields = ("email", "source", "created_at")
    ordering = ("-created_at",)

    def has_add_permission(self, request) -> bool:
        return False
