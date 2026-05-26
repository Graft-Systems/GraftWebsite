from django.contrib import admin

from .models import (
    ContactSubmission,
    NewsArticle,
    NewsroomAccess,
    PredictionBatch,
    PredictionResult,
    WaitlistEntry,
)


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
        preview = str(obj.message).replace("\n", " ").strip()
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


class PredictionResultInline(admin.TabularInline):
    model = PredictionResult
    extra = 0
    can_delete = False
    readonly_fields = (
        "filename",
        "prediction_weight",
        "ground_truth_weight",
        "absolute_error",
        "unit",
        "model",
        "depth_used",
        "latency_ms",
        "created_at",
    )


@admin.register(PredictionBatch)
class PredictionBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "model_name", "processed_count", "created_at")
    list_filter = ("model_name", "created_at")
    search_fields = ("id", "model_name")
    readonly_fields = ("model_name", "processed_count", "created_at")
    ordering = ("-created_at",)
    inlines = (PredictionResultInline,)

    def has_add_permission(self, request) -> bool:
        return False


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = (
        "batch",
        "filename",
        "prediction_weight",
        "ground_truth_weight",
        "absolute_error",
        "model",
        "latency_ms",
        "created_at",
    )
    list_filter = ("model", "unit")
    search_fields = ("filename", "model", "batch__id")
    readonly_fields = (
        "batch",
        "filename",
        "prediction_weight",
        "ground_truth_weight",
        "absolute_error",
        "unit",
        "model",
        "depth_used",
        "latency_ms",
        "image",
        "created_at",
    )
    ordering = ("-created_at",)
    raw_id_fields = ("batch",)

    def has_add_permission(self, request) -> bool:
        return False


@admin.register(NewsroomAccess)
class NewsroomAccessAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "can_publish",
        "can_manage_permissions",
        "granted_by",
        "created_at",
    )
    list_filter = ("can_publish", "can_manage_permissions", "created_at")
    search_fields = ("user__email", "user__name", "user__clerk_user_id")
    raw_id_fields = ("user", "granted_by")
    ordering = ("-created_at",)


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "status", "author", "published_at", "updated_at")
    list_filter = ("status", "published_at", "created_at")
    search_fields = ("title", "slug", "excerpt", "body", "author__email")
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("author",)
    ordering = ("-updated_at",)
