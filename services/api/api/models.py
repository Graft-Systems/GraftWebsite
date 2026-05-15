from __future__ import annotations

import uuid

from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class ContactSubmission(models.Model):
    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped (no API key)"

    name = models.CharField(max_length=200)
    email = models.EmailField(max_length=254)
    message = models.TextField(max_length=5000)
    vineyard_size_acres = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    email_status = models.CharField(
        max_length=16,
        choices=EmailStatus.choices,
        default=EmailStatus.PENDING,
    )
    resend_message_id = models.CharField(max_length=128, blank=True, default="")
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}> — {self.created_at:%Y-%m-%d %H:%M}"


class WaitlistEntry(models.Model):
    email = models.EmailField(max_length=254, unique=True)
    source = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Waitlist entries"

    def __str__(self) -> str:
        return f"{self.email} — {self.created_at:%Y-%m-%d %H:%M}"


class PredictionBatch(models.Model):
    model_name = models.CharField(max_length=128, blank=True, default="")
    processed_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Batch {self.id} — {self.processed_count} items — {self.created_at:%Y-%m-%d %H:%M}"


class PredictionResult(models.Model):
    batch = models.ForeignKey(
        PredictionBatch,
        on_delete=models.CASCADE,
        related_name="results",
    )
    filename = models.CharField(max_length=255)
    prediction_weight = models.FloatField()
    ground_truth_weight = models.FloatField(null=True, blank=True)
    absolute_error = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=32, default="kg")
    model = models.CharField(max_length=128, blank=True, default="")
    depth_used = models.CharField(max_length=512, null=True, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to="prediction_uploads/%Y/%m/%d", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.filename} — {self.prediction_weight:.3f} {self.unit}"


class NewsroomAccess(models.Model):
    """Grants newsroom publish and/or permission-management capability."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "spray.User",
        on_delete=models.CASCADE,
        related_name="newsroom_access",
    )
    can_publish = models.BooleanField(default=True)
    can_manage_permissions = models.BooleanField(default=False)
    granted_by = models.ForeignKey(
        "spray.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="newsroom_grants_given",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Newsroom access grants"

    def __str__(self) -> str:
        flags = []
        if self.can_publish:
            flags.append("publish")
        if self.can_manage_permissions:
            flags.append("manage")
        return f"{self.user.email} ({', '.join(flags) or 'none'})"


class NewsArticle(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=220, unique=True)
    title = models.CharField(max_length=300)
    excerpt = models.TextField(blank=True, default="", max_length=2000)
    body = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    author = models.ForeignKey(
        "spray.User",
        on_delete=models.PROTECT,
        related_name="news_articles",
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"]),
        ]

    def __str__(self) -> str:
        return self.title

    def publish(self) -> None:
        self.status = self.Status.PUBLISHED
        if self.published_at is None:
            self.published_at = timezone.now()

    @staticmethod
    def unique_slug_from_title(title: str, *, exclude_id: uuid.UUID | None = None) -> str:
        base = slugify(title)[:200] or "article"
        candidate = base
        n = 2
        qs = NewsArticle.objects.filter(slug=candidate)
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        while qs.exists():
            suffix = f"-{n}"
            candidate = f"{base[: 220 - len(suffix)]}{suffix}"
            n += 1
            qs = NewsArticle.objects.filter(slug=candidate)
            if exclude_id is not None:
                qs = qs.exclude(id=exclude_id)
        return candidate
