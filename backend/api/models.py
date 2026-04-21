from django.db import models


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
