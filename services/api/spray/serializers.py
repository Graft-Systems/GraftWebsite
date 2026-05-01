"""DRF serializers for the Graft Spray auth/tenancy slice.

Identity fields on `User` (clerk_user_id, email, name) are managed by
the Clerk webhook only; serializers expose them as read-only.

M0-02 step 6 + step 7 + step 9.
"""

from __future__ import annotations

from rest_framework import serializers

from spray.models import ConsentRecord, Membership, Org, User


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
