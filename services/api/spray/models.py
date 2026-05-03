"""Graft Spray data model — auth and tenancy slice (M0-02 step 2).

The 6 models defined here mirror Graft-Spray-App-Spec.md section 9.1
(Operational store) and Graft-Spray-App-Spec.md section 20 (Account &
Identity System):

  - Org              : tenant boundary
  - User             : mirrors Clerk user identity
  - Membership       : Org-User-Role bridge (RBAC)
  - Session          : mirrors Clerk session record
  - AuthEvent        : immutable auth audit trail (spec section 20.8)
  - ConsentRecord    : per-category consent toggle (spec section 19.5)

Subsequent milestones add the rest of the entities per spec section 9.1:
Vineyard, Block (PostGIS), WeatherStation, WeatherObservation,
ExternalRiskIndex (SA-1), RiskIndexRun, SprayRecord, Product, etc.
"""

from __future__ import annotations

import uuid

from django.contrib.gis.db import models as gis_models
from django.db import models

from spray.managers import OrgScopedManager


class Org(models.Model):
    """Tenant boundary.

    Every other tenant-scoped row carries `org_id`. PostgreSQL row-level
    security enforces isolation in production (M0-03 introduces RLS).
    The Owner role on this Org cannot be vacated; deleting the last Owner
    forces transfer or org deletion (enforced at the API layer in step 6).
    """

    class Region(models.TextChoices):
        NAPA = "napa", "Napa"
        SONOMA = "sonoma", "Sonoma"
        BURGUNDY = "burgundy", "Burgundy"
        BORDEAUX = "bordeaux", "Bordeaux"
        MENDOZA = "mendoza", "Mendoza"
        OTHER = "other", "Other"

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    region = models.CharField(
        max_length=20, choices=Region.choices, default=Region.OTHER
    )
    plan = models.CharField(max_length=10, choices=Plan.choices, default=Plan.FREE)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["region"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.region})"


class User(models.Model):
    """Local mirror of Clerk user identity.

    Synced via the Clerk webhook (M0-02 step 5) on user.created /
    user.updated / user.deleted events. `clerk_user_id` is the canonical
    cross-system identifier. Django's built-in `auth_user` table is unused
    for Spray (Clerk owns authentication; we own the application data).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clerk_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    email = models.EmailField()
    phone = models.CharField(max_length=32, null=True, blank=True)
    name = models.CharField(max_length=200, blank=True)
    locale = models.CharField(max_length=10, default="en")
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.email} ({self.clerk_user_id})"

    # Properties below let DRF treat a `spray.User` as an authenticated user
    # without inheriting from `django.contrib.auth.AbstractBaseUser` (Clerk
    # owns authentication; we keep our own model lightweight).
    @property
    def is_authenticated(self) -> bool:
        return self.deleted_at is None

    @property
    def is_anonymous(self) -> bool:
        return False


class Membership(models.Model):
    """Org-User-Role bridge.

    Enforces the four-role RBAC model from spec section 20.2. The role
    field is the source of truth; permission classes (M0-02 step 4)
    enforce it at the API layer.
    """

    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"
        VIEWER = "VIEWER", "Viewer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(
        max_length=10, choices=Role.choices, default=Role.MEMBER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["org", "user"], name="unique_org_user_membership"
            ),
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["org", "role"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} = {self.role} of {self.org.name}"


class Session(models.Model):
    """Active session record, mirrored from Clerk.

    Synced via the Clerk webhook on session.created / session.removed
    events. Used for "log out from all devices" (revokes all
    non-revoked sessions) and the security dashboard.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sessions"
    )
    clerk_session_id = models.CharField(max_length=64, unique=True, db_index=True)
    jwt_jti = models.CharField(max_length=64, blank=True)
    device = models.CharField(max_length=200, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "revoked_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"Session {self.clerk_session_id} for {self.user.email}"


class AuthEvent(models.Model):
    """Immutable audit trail per spec section 20.8.

    Captures every authentication-relevant event: signup, login, logout,
    password change, MFA enable/disable, role change, account deletion,
    consent grant/withdraw. Retained for 7 years per SOC 2.

    Rows are insert-only by application convention (no UPDATE or DELETE
    paths). For now this is enforced at the application layer; M0-03
    introduces a database trigger to make it immutable at the DB level.
    """

    class Type(models.TextChoices):
        SIGN_UP = "sign_up", "Sign up"
        EMAIL_VERIFY = "email_verify", "Email verify"
        LOGIN_SUCCESS = "login_success", "Login success"
        LOGIN_FAILURE = "login_failure", "Login failure"
        LOGOUT = "logout", "Logout"
        LOGOUT_ALL_DEVICES = "logout_all_devices", "Logout from all devices"
        PASSWORD_CHANGE = "password_change", "Password change"
        PASSWORD_RESET_REQUESTED = (
            "password_reset_requested",
            "Password reset requested",
        )
        PASSWORD_RESET_COMPLETED = (
            "password_reset_completed",
            "Password reset completed",
        )
        MFA_ENABLE = "mfa_enable", "MFA enable"
        MFA_DISABLE = "mfa_disable", "MFA disable"
        ROLE_CHANGE = "role_change", "Role change"
        ORG_CREATED = "org_created", "Org created"
        ORG_INVITE_SENT = "org_invite_sent", "Org invite sent"
        ORG_INVITE_ACCEPTED = "org_invite_accepted", "Org invite accepted"
        ORG_MEMBER_REMOVED = "org_member_removed", "Org member removed"
        ACCOUNT_DELETION_REQUESTED = (
            "account_deletion_requested",
            "Account deletion requested",
        )
        ACCOUNT_DELETION_COMPLETED = (
            "account_deletion_completed",
            "Account deletion completed",
        )
        CONSENT_GRANTED = "consent_granted", "Consent granted"
        CONSENT_WITHDRAWN = "consent_withdrawn", "Consent withdrawn"

    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auth_events",
    )
    org = models.ForeignKey(
        Org,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auth_events",
    )
    type = models.CharField(max_length=40, choices=Type.choices)
    outcome = models.CharField(
        max_length=10, choices=Outcome.choices, default=Outcome.SUCCESS
    )
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["org", "created_at"]),
            models.Index(fields=["type", "created_at"]),
        ]

    def __str__(self) -> str:
        who = self.user.email if self.user else "anonymous"
        return f"{self.type} ({self.outcome}) by {who}"


class ConsentRecord(models.Model):
    """Per-category consent toggle per spec section 19.5.

    Each category can be on or off independently. The application keeps
    working regardless of consent state, with degraded functionality where
    applicable (e.g., user's own captures still grade, but they do not
    contribute to the training corpus when `photo_for_training` is off).
    """

    class Category(models.TextChoices):
        PHOTO_FOR_TRAINING = (
            "photo_for_training",
            "Use my photos and videos for ML training",
        )
        SPRAY_RECORDS_FOR_BENCHMARKS = (
            "spray_records_for_benchmarks",
            "Use my spray records for benchmarks",
        )
        ANONYMIZED_AGGREGATES = (
            "anonymized_aggregates",
            "Share anonymized aggregate insights",
        )
        MARKETING_EMAIL = "marketing_email", "Receive marketing email"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="consent_records"
    )
    category = models.CharField(max_length=40, choices=Category.choices)
    granted = models.BooleanField(default=False)
    granted_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category"],
                name="unique_user_category_consent",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "category"]),
        ]

    def __str__(self) -> str:
        state = "granted" if self.granted else "withdrawn"
        return f"{self.user.email}: {self.category} = {state}"


# =====================================================================
# M0-03 step 4: Spatial entities + DataLakeEvent skeleton
# =====================================================================


class Vineyard(models.Model):
    """A vineyard property owned by an Org (spec section 9.1).

    Centroid is optional at create time (the M0-05 polygon-draw flow
    typically sets blocks first, then we compute the centroid as the
    union centroid of constituent block geoms).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org, on_delete=models.CASCADE, related_name="vineyards"
    )
    name = models.CharField(max_length=200)
    region = models.CharField(
        max_length=20, choices=Org.Region.choices, default=Org.Region.OTHER
    )
    address = models.CharField(max_length=400, blank=True)
    centroid = gis_models.PointField(srid=4326, null=True, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager()

    class Meta:
        indexes = [
            models.Index(fields=["org"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.region})"


class Block(models.Model):
    """Sub-vineyard block with PostGIS polygon geometry (spec section 9.1).

    `vineyard__org_id` is the tenant scope. Cascade-deletes follow the
    Vineyard; archive cascades through the API layer (see views.py
    Vineyard archive endpoint).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vineyard = models.ForeignKey(
        Vineyard, on_delete=models.CASCADE, related_name="blocks"
    )
    name = models.CharField(max_length=120)
    geom = gis_models.PolygonField(srid=4326)
    variety = models.CharField(max_length=80, blank=True)
    training_system = models.CharField(max_length=80, blank=True)
    # Decimal(4,2) covers 0.01m to 99.99m. Spec section 9.1.
    row_spacing_m = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager(via="vineyard__org_id")

    class Meta:
        indexes = [
            models.Index(fields=["vineyard"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.vineyard.name} / {self.name}"


class DataLakeEvent(models.Model):
    """Skeleton table for spec section 19 data-lake events.

    M0-03 emits rows on Vineyard / Block writes so M0-04 can plug in the
    S3 + Iceberg forwarding without retroactively backfilling. No
    forwarding logic at M0-03; rows just accumulate.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="data_lake_events",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="data_lake_events",
    )
    category = models.CharField(max_length=80)
    schema_version = models.CharField(max_length=20)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrgScopedManager()

    class Meta:
        indexes = [
            models.Index(fields=["org", "category", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.category} v{self.schema_version} @ {self.created_at}"
