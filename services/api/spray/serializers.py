"""DRF serializers for the Graft Spray auth/tenancy slice.

Identity fields on `User` (clerk_user_id, email, name) are managed by
the Clerk webhook only; serializers expose them as read-only.

M0-02 step 6 + step 7 + step 9.
"""

from __future__ import annotations

from rest_framework import serializers

from spray.models import (
    Block,
    BlockVerdict,
    ConsentRecord,
    IntegrationConnection,
    Membership,
    Org,
    RiskRecord,
    SensorStation,
    SprayRecord,
    User,
    Vineyard,
)


class UserSerializer(serializers.ModelSerializer):
    """Read-only view of a Spray user."""

    class Meta:
        model = User
        fields = ["id", "clerk_user_id", "email", "name", "phone", "locale", "created_at"]
        read_only_fields = fields


class OrgSerializer(serializers.ModelSerializer):
    """Org summary used in list and detail responses.

    Plan and created_at are immutable; archived_at is set only via the
    DELETE endpoint (which archives rather than hard-deletes).
    """

    class Meta:
        model = Org
        fields = [
            "id",
            "name",
            "region",
            "plan",
            "settings",
            "created_at",
            "archived_at",
        ]
        read_only_fields = ["id", "plan", "created_at", "archived_at"]


class MembershipSerializer(serializers.ModelSerializer):
    """Membership with embedded user and org summaries."""

    user = UserSerializer(read_only=True)
    org = OrgSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "org", "role", "created_at"]
        read_only_fields = ["id", "user", "org", "created_at"]


class ConsentRecordSerializer(serializers.ModelSerializer):
    """Per-category consent toggle."""

    class Meta:
        model = ConsentRecord
        fields = ["category", "granted", "granted_at", "withdrawn_at"]
        read_only_fields = ["granted_at", "withdrawn_at"]


class InviteSerializer(serializers.Serializer):
    """Body for POST /api/spray/orgs/<id>/invite.

    For M0-02, invite assigns membership to an EXISTING user looked up by
    email. Pending invites for not-yet-signed-up users land in M0-02a
    via Clerk's invitations API.
    """

    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            Membership.Role.MEMBER,
            Membership.Role.ADMIN,
            Membership.Role.VIEWER,
        ],
        default=Membership.Role.MEMBER,
    )


class RoleChangeSerializer(serializers.Serializer):
    """Body for PATCH /api/spray/orgs/<id>/memberships/<user_id>."""

    role = serializers.ChoiceField(choices=Membership.Role.choices)


class ConsentToggleSerializer(serializers.Serializer):
    """Single item in the POST /api/spray/account/consent body array."""

    category = serializers.ChoiceField(choices=ConsentRecord.Category.choices)
    granted = serializers.BooleanField()


class AccountDeleteSerializer(serializers.Serializer):
    """Body for POST /api/spray/account/delete.

    `confirm: true` is required. Frontend layers a confirmation modal on
    top so the two-step UX surfaces to the user; the backend treats this
    as a single atomic call once `confirm: true` is asserted.
    """

    confirm = serializers.BooleanField()


# ---------------------------------------------------------------------
# M0-03: Vineyard + Block (spatial)
# ---------------------------------------------------------------------


class GeometryField(serializers.Field):
    """Serialize PostGIS geometry to GeoJSON dict; deserialize from GeoJSON or WKT.

    Reads:  returns the geometry as a GeoJSON-compatible dict (parsed
    from GEOSGeometry.geojson). None if the field is null.

    Writes: accepts either a GeoJSON dict ({"type": "Polygon",
    "coordinates": [...]}) or a WKT string ("POLYGON((..))"). GeoDjango
    parses both via GEOSGeometry.
    """

    def to_representation(self, value):
        if value is None:
            return None
        import json
        return json.loads(value.geojson)

    def to_internal_value(self, data):
        from django.contrib.gis.geos import GEOSGeometry, GEOSException
        import json

        if data in (None, ""):
            return None
        try:
            if isinstance(data, dict):
                return GEOSGeometry(json.dumps(data), srid=4326)
            return GEOSGeometry(data, srid=4326)
        except (GEOSException, ValueError, TypeError) as e:
            raise serializers.ValidationError(f"invalid geometry: {e}")


class VineyardSerializer(serializers.ModelSerializer):
    """Vineyard read/write. Centroid is optional GeoJSON Point in EPSG:4326."""

    centroid = GeometryField(required=False, allow_null=True)
    org_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Vineyard
        fields = [
            "id",
            "org_id",
            "name",
            "region",
            "address",
            "centroid",
            "settings",
            "created_at",
            "archived_at",
        ]
        read_only_fields = ["id", "created_at", "archived_at"]


class BlockSerializer(serializers.ModelSerializer):
    """Block read/write. Geom is required GeoJSON Polygon in EPSG:4326."""

    geom = GeometryField()
    vineyard_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Block
        fields = [
            "id",
            "vineyard_id",
            "name",
            "geom",
            "variety",
            "training_system",
            "row_spacing_m",
            "settings",
            "created_at",
            "archived_at",
        ]
        read_only_fields = ["id", "created_at", "archived_at"]


# ---------------------------------------------------------------------
# M1-09: Capture upload
# ---------------------------------------------------------------------


class CaptureInitSerializer(serializers.Serializer):
    """Body for POST /captures/init."""

    kind = serializers.ChoiceField(choices=[("photo", "Photo"), ("video", "Video")])
    mime_type = serializers.CharField(max_length=80)
    size_bytes = serializers.IntegerField(min_value=1, max_value=25 * 1024 * 1024)
    taken_at = serializers.DateTimeField(required=False, allow_null=True)


class CaptureSerializer(serializers.ModelSerializer):
    """Read-side; embeds a fresh presigned GET URL on each serialization.

    Imports inside `get_download_url` are local to break a circular
    import (imagery -> models -> serializers).
    """

    download_url = serializers.SerializerMethodField()
    block_id = serializers.UUIDField(source="block.id", read_only=True)

    def get_download_url(self, obj):
        from spray.models import Capture as _Capture

        if obj.status != _Capture.Status.UPLOADED:
            return None
        from spray.imagery import presigned_get_url
        try:
            return presigned_get_url(obj.s3_key)
        except Exception:  # noqa: BLE001
            return None

    class Meta:
        from spray.models import Capture as _Capture

        model = _Capture
        fields = [
            "id",
            "block_id",
            "kind",
            "size_bytes",
            "mime_type",
            "taken_at",
            "uploaded_at",
            "status",
            "download_url",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------
# M1.5 PR-C: Aggregation engine — RiskRecord + BlockVerdict
# ---------------------------------------------------------------------


class RiskRecordSerializer(serializers.ModelSerializer):
    """Read-only view of a RiskRecord row."""

    class Meta:
        model = RiskRecord
        fields = [
            "id",
            "block",
            "model_id",
            "model_version",
            "valid_from",
            "valid_to",
            "pathogen",
            "severity_1_10",
            "raw_score",
            "thresholds_fired",
            "input_snapshot_id",
            "confidence",
            "citation_id",
            "created_at",
        ]
        read_only_fields = fields


class BlockVerdictSerializer(serializers.ModelSerializer):
    """Read-only view of a BlockVerdict row."""

    directive = serializers.SerializerMethodField()

    def get_directive(self, obj):
        from spray.recommendation.directive import directive_from_verdict

        return directive_from_verdict(obj)

    class Meta:
        model = BlockVerdict
        fields = [
            "id",
            "block",
            "date",
            "powdery_severity_1_10",
            "downy_severity_1_10",
            "powdery_confidence",
            "downy_confidence",
            "action",
            "urgency",
            "drivers",
            "split_summary",
            "forecast_7d",
            "advisory_events",
            "model_versions",
            "generated_at",
            "audit_hash",
            "directive",
            "created_at",
        ]
        read_only_fields = fields


class SprayRecordSerializer(serializers.ModelSerializer):
    """Spray operation record for vineyard-manager audit history."""

    block_name = serializers.CharField(source="block.name", read_only=True)
    vineyard_name = serializers.CharField(source="block.vineyard.name", read_only=True)

    class Meta:
        model = SprayRecord
        fields = [
            "id",
            "block",
            "block_name",
            "vineyard_name",
            "verdict",
            "applied_at",
            "product",
            "rate",
            "target_disease",
            "rei_hours",
            "phi_days",
            "applicator",
            "notes",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = [
            "id",
            "block_name",
            "vineyard_name",
            "created_at",
            "updated_at",
            "archived_at",
        ]


# ---------------------------------------------------------------------
# M1.5 PR-D: Sensor connector serializers
# ---------------------------------------------------------------------


class IntegrationConnectionSerializer(serializers.ModelSerializer):
    """Read-only view of an IntegrationConnection. Token blob NEVER serialized."""

    class Meta:
        model = IntegrationConnection
        fields = [
            "id",
            "vendor",
            "vendor_account_id",
            "status",
            "connected_at",
            "disconnected_at",
            "last_health_at",
            "last_health_detail",
        ]
        read_only_fields = fields


class SensorStationSerializer(serializers.ModelSerializer):
    """Read-only view of a SensorStation, with linked block IDs."""

    linked_block_ids = serializers.SerializerMethodField()

    class Meta:
        model = SensorStation
        fields = [
            "id",
            "connection",
            "vendor_station_id",
            "name",
            "lat",
            "lon",
            "last_seen_at",
            "linked_block_ids",
            "created_at",
        ]
        read_only_fields = fields

    def get_linked_block_ids(self, obj) -> list[str]:
        return [str(b.id) for b in obj.linked_blocks.all()]
