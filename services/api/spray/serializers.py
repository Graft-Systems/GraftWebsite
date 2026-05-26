"""DRF serializers for the Graft Spray auth/tenancy slice.

Identity fields on `User` (clerk_user_id, email, name) are managed by
the Clerk webhook only; serializers expose them as read-only.

M0-02 step 6 + step 7 + step 9.
"""

from __future__ import annotations

from django.utils import timezone
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
    WeatherStation,
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
    block_count = serializers.SerializerMethodField(read_only=True)

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
            "block_count",
        ]
        read_only_fields = ["id", "created_at", "archived_at", "block_count"]

    def get_block_count(self, obj):
        """Active (non-archived) blocks; list views annotate `active_block_count` to avoid N+1."""
        annotated = getattr(obj, "active_block_count", None)
        if annotated is not None:
            return annotated
        return Block.objects.unscoped().filter(
            vineyard_id=obj.pk, archived_at__isnull=True
        ).count()


def merge_block_geometries(existing, addition):
    """Union existing + new polygon; persist as MultiPolygon (EPSG:4326)."""
    from django.contrib.gis.geos import MultiPolygon

    if addition.geom_type != "Polygon":
        raise serializers.ValidationError("append_geom must be a Polygon")
    merged = existing.union(addition)
    if merged.geom_type == "Polygon":
        return MultiPolygon(merged)
    if merged.geom_type == "MultiPolygon":
        return merged
    raise serializers.ValidationError(
        f"Could not merge footprint: union returned {merged.geom_type}"
    )

def subtract_block_geometries(existing, subtraction):
    """Difference existing - subtraction polygon; persist as MultiPolygon (EPSG:4326)."""
    from django.contrib.gis.geos import MultiPolygon, Polygon

    if subtraction.geom_type != "Polygon":
        raise serializers.ValidationError("subtract_geom must be a Polygon")
    diff = existing.difference(subtraction)
    
    if diff.empty:
        raise serializers.ValidationError("Cannot completely erase block geometry.")
        
    if diff.geom_type == "Polygon":
        return MultiPolygon(diff)
    if diff.geom_type == "MultiPolygon":
        return diff
    if diff.geom_type == "GeometryCollection":
        # Keep only polygons from the collection
        polys = [g for g in diff if g.geom_type == "Polygon"]
        if not polys:
             raise serializers.ValidationError("Erase operation resulted in no valid polygons.")
        return MultiPolygon(polys)
        
    raise serializers.ValidationError(
        f"Could not erase footprint: difference returned {diff.geom_type}"
    )

class BlockSerializer(serializers.ModelSerializer):
    """Block read/write. `geom` is GeoJSON Polygon or MultiPolygon; `append_geom` merges, `subtract_geom` subtracts."""

    geom = GeometryField(required=False)
    append_geom = GeometryField(write_only=True, required=False)
    subtract_geom = GeometryField(write_only=True, required=False)
    vineyard_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Block
        fields = [
            "id",
            "vineyard_id",
            "name",
            "geom",
            "append_geom",
            "subtract_geom",
            "variety",
            "training_system",
            "row_spacing_m",
            "settings",
            "created_at",
            "archived_at",
        ]
        read_only_fields = ["id", "created_at", "archived_at"]

    def validate(self, data):
        geom_keys = [k for k in ["geom", "append_geom", "subtract_geom"] if data.get(k) is not None]
        if len(geom_keys) > 1:
            raise serializers.ValidationError(
                "Send only one of geom, append_geom, or subtract_geom."
            )
        return data

    def create(self, validated_data):
        validated_data.pop("append_geom", None)
        validated_data.pop("subtract_geom", None)
        if "geom" not in validated_data or validated_data["geom"] is None:
            raise serializers.ValidationError({"geom": "geom is required when creating a block"})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        append = validated_data.pop("append_geom", None)
        if append is not None:
            validated_data["geom"] = merge_block_geometries(instance.geom, append)
            
        subtract = validated_data.pop("subtract_geom", None)
        if subtract is not None:
            validated_data["geom"] = subtract_block_geometries(instance.geom, subtract)
            
        incoming_settings = validated_data.pop("settings", None)
        if incoming_settings is not None:
            merged = {**(instance.settings or {}), **incoming_settings}
            validated_data["settings"] = merged
        return super().update(instance, validated_data)


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
    block_name = serializers.CharField(source="block.name", read_only=True)
    vineyard_name = serializers.CharField(
        source="block.vineyard.name", read_only=True
    )

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
            "block_name",
            "vineyard_name",
            "kind",
            "size_bytes",
            "mime_type",
            "taken_at",
            "uploaded_at",
            "status",
            "notes",
            "download_url",
            "created_at",
        ]
        read_only_fields = fields


class CaptureUpdateSerializer(serializers.ModelSerializer):
    """PATCH body for capture detail — notes only."""

    class Meta:
        from spray.models import Capture as _Capture

        model = _Capture
        fields = ["notes"]


def _validate_vine_location_in_block(block, location) -> None:
    if location is None:
        raise serializers.ValidationError({"location": "Location is required."})
    if not block.geom.contains(location):
        raise serializers.ValidationError(
            {"location": "Vine must be inside the block footprint."}
        )


def _next_vine_index(block, row_index: int) -> int:
    from django.db.models import Max

    from spray.models import Vine

    agg = (
        Vine.objects.filter(
            block=block,
            row_index=row_index,
            archived_at__isnull=True,
        ).aggregate(m=Max("vine_index"))
    )
    return int(agg["m"] or 0) + 1


class VineSerializer(serializers.ModelSerializer):
    """Vine read/write; `location` is GeoJSON Point."""

    location = GeometryField()
    block_id = serializers.UUIDField(source="block.id", read_only=True)

    class Meta:
        from spray.models import Vine as _Vine

        model = _Vine
        fields = [
            "id",
            "block_id",
            "location",
            "row_index",
            "vine_index",
            "status",
            "label",
            "settings",
            "created_at",
            "archived_at",
        ]
        read_only_fields = ["id", "block_id", "created_at", "archived_at"]
        extra_kwargs = {"vine_index": {"required": False}}

    def validate(self, data):
        block = self.context.get("block")
        if block is None:
            return data
        loc = data.get("location")
        if loc is not None or self.instance is None:
            point = loc if loc is not None else getattr(self.instance, "location", None)
            _validate_vine_location_in_block(block, point)
        row_index = data.get("row_index")
        vine_index = data.get("vine_index")
        if self.instance is None and vine_index is None and row_index is not None:
            data["vine_index"] = _next_vine_index(block, row_index)
        return data

    def create(self, validated_data):
        validated_data["block"] = self.context["block"]
        return super().create(validated_data)


class VineRowBulkSerializer(serializers.Serializer):
    """Place evenly spaced vines along a row segment."""

    row_index = serializers.IntegerField(min_value=1)
    start = serializers.ListField(
        child=serializers.FloatField(), min_length=2, max_length=2
    )
    end = serializers.ListField(
        child=serializers.FloatField(), min_length=2, max_length=2
    )
    count = serializers.IntegerField(min_value=2, max_value=250)
    replace_row = serializers.BooleanField(default=True)

    def validate(self, data):
        block = self.context.get("block")
        if block is None:
            return data
        from django.contrib.gis.geos import Point

        for key in ("start", "end"):
            lng, lat = data[key]
            _validate_vine_location_in_block(block, Point(lng, lat, srid=4326))
        return data

    def create(self, validated_data):
        from django.contrib.gis.geos import Point

        from spray.models import Vine

        block = self.context["block"]
        row_index = validated_data["row_index"]
        count = validated_data["count"]
        lng0, lat0 = validated_data["start"]
        lng1, lat1 = validated_data["end"]

        if validated_data.get("replace_row", True):
            Vine.objects.filter(
                block=block,
                row_index=row_index,
                archived_at__isnull=True,
            ).update(archived_at=timezone.now())

        created = []
        for i in range(count):
            t = i / (count - 1) if count > 1 else 0.0
            lng = lng0 + (lng1 - lng0) * t
            lat = lat0 + (lat1 - lat0) * t
            vine = Vine.objects.create(
                block=block,
                location=Point(lng, lat, srid=4326),
                row_index=row_index,
                vine_index=i + 1,
                status=Vine.Status.OK,
            )
            created.append(vine)
        return created


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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        org_id = self.context.get("org_id")
        if org_id is None:
            return
        from spray.models import Block, BlockVerdict

        self.fields["block"].queryset = Block.objects.for_org(org_id).filter(
            archived_at__isnull=True
        )
        self.fields["verdict"].queryset = BlockVerdict.objects.for_org(org_id).filter(
            block__archived_at__isnull=True
        )

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


class WeatherStationSerializer(serializers.ModelSerializer):
    """Weather data source (physical or gridded)."""

    location = GeometryField(required=True)

    class Meta:
        model = WeatherStation
        fields = [
            "id",
            "org",
            "provider",
            "station_id",
            "name",
            "location",
            "is_regional_default",
            "region",
            "settings",
            "created_at",
            "last_pull_at",
        ]
        read_only_fields = ["id", "org", "created_at", "last_pull_at"]
