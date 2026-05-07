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
    # Set by the worker after a successful S3 PUT. NULL means the row
    # is still pending forwarding.
    forwarded_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager()

    class Meta:
        indexes = [
            models.Index(fields=["org", "category", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.category} v{self.schema_version} @ {self.created_at}"


# =====================================================================
# M0-06 step 2: Weather + External risk index
# =====================================================================


class WeatherStation(models.Model):
    """A weather data source — physical or virtual (gridded provider).

    Regional-default stations have `org=None` and `is_regional_default=True`;
    user-connected stations carry `org=...`. View layer combines both via
    `Q(org=request_org) | Q(is_regional_default=True)`. RLS is intentionally
    NOT applied to this table because allowing null org rows to be globally
    readable is incompatible with policy-based filtering.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="weather_stations",
    )
    provider = models.CharField(max_length=40)
    station_id = models.CharField(max_length=120)
    name = models.CharField(max_length=200, blank=True)
    location = gis_models.PointField(srid=4326)
    is_regional_default = models.BooleanField(default=False)
    region = models.CharField(
        max_length=20, choices=Org.Region.choices, default=Org.Region.OTHER
    )
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_pull_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "station_id"],
                name="unique_provider_station",
            ),
        ]
        indexes = [
            models.Index(fields=["org"]),
            models.Index(fields=["region", "is_regional_default"]),
        ]

    def __str__(self) -> str:
        return f"{self.provider}:{self.station_id} ({self.name or self.region})"


class WeatherObservation(models.Model):
    """Hourly weather reading — historical or forecast."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    station = models.ForeignKey(
        WeatherStation, on_delete=models.CASCADE, related_name="observations"
    )
    ts = models.DateTimeField()
    temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rh_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    leaf_wetness_min = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    wind_speed_ms = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    precip_mm = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    is_forecast = models.BooleanField(default=False)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["station", "ts"], name="unique_station_ts"
            ),
        ]
        indexes = [
            models.Index(fields=["station", "-ts"]),
        ]

    def __str__(self) -> str:
        kind = "forecast" if self.is_forecast else "obs"
        return f"{kind} {self.station_id} @ {self.ts}"


class ExternalRiskIndex(models.Model):
    """SA-1 hourly aggregation of public extension-service risk indices.

    Spec amendment SA-1 (Appendix A): a parallel layer to the local
    forecasting engines that pulls authoritative regional indices
    (UC IPM Grape PM RAI, uspest.org Grape PM) for cross-reference and
    recommendation confidence.
    """

    class Source(models.TextChoices):
        UC_IPM_GRAPE_PM = "uc_ipm_grape_pm", "UC IPM Grape PM RAI"
        USPEST_GRAPE_PM = "uspest_grape_pm", "uspest.org Grape PM"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region = models.CharField(max_length=40)  # AVA cluster name or state code
    source = models.CharField(max_length=40, choices=Source.choices)
    risk_index_value = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices, default=RiskLevel.LOW
    )
    pulled_at = models.DateTimeField(auto_now_add=True)
    pulled_at_hour = models.DateTimeField(
        help_text="pulled_at truncated to the hour; primary dedup field."
    )
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["region", "source", "pulled_at_hour"],
                name="unique_region_source_hour",
            ),
        ]
        indexes = [
            models.Index(fields=["region", "source", "-pulled_at_hour"]),
            models.Index(fields=["pulled_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.source} {self.region}: {self.risk_level} @ {self.pulled_at_hour}"


# =====================================================================
# M1-09 step 2: Capture upload
# =====================================================================


class Capture(models.Model):
    """Photo or video upload tied to a Block (spec §8.5).

    Lifecycle: pending (init created, presigned PUT URL minted but no S3
    confirmation yet) -> uploaded (finalize endpoint confirmed via S3
    HEAD) -> failed (init aged out >1 hour without finalize; reaped in
    M1-10 alongside the ML inference dispatch sweeper).
    """

    class Kind(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        UPLOADED = "uploaded", "Uploaded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(
        Block, on_delete=models.CASCADE, related_name="captures"
    )
    uploader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="captures",
    )
    kind = models.CharField(max_length=10, choices=Kind.choices)
    s3_key = models.CharField(max_length=400, unique=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=80, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True, db_index=True)
    uploaded_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager(via="block__vineyard__org_id")

    class Meta:
        indexes = [
            models.Index(fields=["block", "-uploaded_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.kind} {self.s3_key} ({self.status})"


# =====================================================================
# M1.5 PR-C: Aggregation engine — RiskRecord + BlockVerdict (SA-2)
# =====================================================================


class RiskRecord(models.Model):
    """Single mechanistic-model output for one block per pathogen per window.

    Mirrors the `risk_record.emitted.v1` event schema. Persisted so the
    ensemble engine can audit-trail every input that fed a verdict, and
    so future Year-1 weighted ensembles can train against historical
    runner outputs.
    """

    class Pathogen(models.TextChoices):
        POWDERY = "powdery", "Powdery"
        DOWNY = "downy", "Downy"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(
        Block, on_delete=models.CASCADE, related_name="risk_records"
    )
    model_id = models.CharField(max_length=80)
    model_version = models.CharField(max_length=32)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    pathogen = models.CharField(max_length=10, choices=Pathogen.choices)
    severity_1_10 = models.DecimalField(max_digits=4, decimal_places=2)
    raw_score = models.JSONField(default=dict)
    thresholds_fired = models.JSONField(default=list)
    input_snapshot_id = models.CharField(max_length=80)
    confidence = models.DecimalField(max_digits=5, decimal_places=4)
    citation_id = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrgScopedManager(via="block__vineyard__org_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["block", "model_id", "valid_from"],
                name="unique_block_model_window",
            ),
        ]
        indexes = [
            models.Index(fields=["block", "-valid_from"]),
            models.Index(fields=["pathogen", "-valid_from"]),
            models.Index(fields=["model_id", "-valid_from"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.model_id} {self.pathogen} sev={self.severity_1_10} "
            f"@ {self.valid_from.date()}"
        )


class BlockVerdict(models.Model):
    """Daily ensemble verdict — the single decision-intelligence output
    surfaced to growers. Mirrors `block_verdict.generated.v1`.
    """

    class Action(models.TextChoices):
        SPRAY = "spray", "Spray"
        HOLD = "hold", "Hold"
        SCOUT = "scout", "Scout"

    class Urgency(models.TextChoices):
        NOW = "now", "Now"
        H24 = "24h", "24h"
        H72 = "72h", "72h"
        NONE = "none", "None"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(
        Block, on_delete=models.CASCADE, related_name="verdicts"
    )
    date = models.DateField()
    powdery_severity_1_10 = models.DecimalField(max_digits=4, decimal_places=2)
    downy_severity_1_10 = models.DecimalField(max_digits=4, decimal_places=2)
    powdery_confidence = models.DecimalField(max_digits=5, decimal_places=4)
    downy_confidence = models.DecimalField(max_digits=5, decimal_places=4)
    action = models.CharField(max_length=10, choices=Action.choices)
    urgency = models.CharField(max_length=10, choices=Urgency.choices)
    drivers = models.JSONField(default=list)
    split_summary = models.TextField(blank=True)
    forecast_7d = models.JSONField(default=list)
    advisory_events = models.JSONField(default=list)
    model_versions = models.JSONField(default=dict)
    generated_at = models.DateTimeField()
    audit_hash = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrgScopedManager(via="block__vineyard__org_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["block", "date"], name="unique_block_date_verdict"
            ),
        ]
        indexes = [
            models.Index(fields=["block", "-date"]),
            models.Index(fields=["action", "-date"]),
        ]

    def __str__(self) -> str:
        return f"{self.block_id} {self.date} {self.action} ({self.urgency})"


# =====================================================================
# M1.5 PR-D: Sensor connectors — IntegrationConnection + SensorStation
# + SensorReading + OAuthState (SA-2)
# =====================================================================


class IntegrationConnection(models.Model):
    """One vendor-API connection per (org, vendor, vendor_account_id).

    Holds the encrypted OAuth/refresh token blob for vendors the customer
    authenticates against (Pessl, Davis, METER, Sencrop). The plaintext
    token never leaves `spray.connectors.credentials`; views and admin
    surface only `status` + metadata. Spec §12A, §17.1, §20.4.
    """

    class Vendor(models.TextChoices):
        PESSL = "pessl", "Pessl FieldClimate"
        DAVIS = "davis", "Davis WeatherLink"
        METER = "meter", "METER ZENTRA"
        SENCROP = "sencrop", "Sencrop"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        NEEDS_REAUTH = "needs_reauth", "Needs reauth"
        DISCONNECTED = "disconnected", "Disconnected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Org, on_delete=models.CASCADE, related_name="integration_connections"
    )
    vendor = models.CharField(max_length=20, choices=Vendor.choices)
    vendor_account_id = models.CharField(max_length=120)
    token_ciphertext = models.BinaryField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    connected_at = models.DateTimeField(auto_now_add=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    last_health_at = models.DateTimeField(null=True, blank=True)
    last_health_detail = models.CharField(max_length=200, blank=True)

    objects = OrgScopedManager(via="org_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["org", "vendor", "vendor_account_id"],
                name="unique_org_vendor_account",
            ),
        ]
        indexes = [
            models.Index(fields=["org", "vendor", "status"]),
            models.Index(fields=["status", "-connected_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.vendor}:{self.vendor_account_id} ({self.status})"


class SensorStation(models.Model):
    """One vendor station, optionally linked to one or more Blocks.

    The vendor owns `vendor_station_id`; we own the link to Blocks via the
    `linked_blocks` M2M. A station can serve multiple Blocks within the
    same Org (e.g. a station between two adjacent blocks).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(
        IntegrationConnection,
        on_delete=models.CASCADE,
        related_name="stations",
    )
    vendor_station_id = models.CharField(max_length=120)
    name = models.CharField(max_length=200, blank=True)
    lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    lon = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    last_seen_at = models.DateTimeField(null=True, blank=True)
    linked_blocks = models.ManyToManyField(
        Block,
        through="SensorStationBlock",
        related_name="sensor_stations",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    objects = OrgScopedManager(via="connection__org_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "vendor_station_id"],
                name="unique_connection_vendor_station",
            ),
        ]
        indexes = [
            models.Index(fields=["connection", "-last_seen_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.connection.vendor}:{self.vendor_station_id}"


class SensorStationBlock(models.Model):
    """Audit trail for who linked which Station to which Block when."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    station = models.ForeignKey(SensorStation, on_delete=models.CASCADE)
    block = models.ForeignKey(Block, on_delete=models.CASCADE)
    linked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["station", "block"],
                name="unique_station_block_link",
            ),
        ]


class SensorReading(models.Model):
    """Canonical sensor reading per spec §12A.3.

    All vendor payloads normalize to this schema. Tenancy resolved via
    `station.connection.org_id`; no `org_id` denorm. Hour-grain `ts`
    (UTC) with `(station, ts)` unique upsert. Leaf wetness in MINUTES
    (Pessl native; Davis 0-15 normalized in the connector).
    """

    class QualityFlag(models.TextChoices):
        OK = "ok", "OK"
        ESTIMATED = "estimated", "Estimated"
        GAP_FILLED = "gap_filled", "Gap-filled"
        STALE = "stale", "Stale"
        BAD = "bad", "Bad"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    station = models.ForeignKey(
        SensorStation, on_delete=models.CASCADE, related_name="readings"
    )
    ts = models.DateTimeField()
    air_temp_c = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    rh_pct = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    leaf_wetness_min = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )
    precip_mm = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    wind_speed_ms = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    quality_flag = models.CharField(
        max_length=20,
        choices=QualityFlag.choices,
        default=QualityFlag.OK,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrgScopedManager(via="station__connection__org_id")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["station", "ts"], name="unique_station_ts_reading"
            ),
        ]
        indexes = [
            models.Index(fields=["station", "-ts"]),
            models.Index(fields=["quality_flag", "-ts"]),
        ]

    def __str__(self) -> str:
        return f"{self.station_id} @ {self.ts.isoformat()}"


class OAuthState(models.Model):
    """Short-lived CSRF/state token for OAuth round-trips.

    Created at /oauth/start; verified + consumed at /oauth/callback. TTL
    10 minutes. Not org-scoped at the row level (callback has no org
    context yet — state IS the link), but `state` is HMAC-signed with
    the org_id so a tampered state can't redirect to another org.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.CharField(max_length=128, unique=True)
    org = models.ForeignKey(
        Org, on_delete=models.CASCADE, related_name="oauth_states"
    )
    vendor = models.CharField(max_length=20)
    redirect_after = models.CharField(max_length=400, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["expires_at"]),
            models.Index(fields=["org", "vendor"]),
        ]

    def __str__(self) -> str:
        return f"{self.vendor} state {self.state[:8]}…"
