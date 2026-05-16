"""Serializers for the Graft newsroom API."""

from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from api.models import NewsArticle, NewsroomAccess, NewsImage
from spray.models import User


class NewsImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsImage
        fields = ("id", "image", "created_at")
        read_only_fields = ("id", "created_at")


class NewsAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name")


class NewsArticlePublicSerializer(serializers.ModelSerializer):
    author = NewsAuthorSerializer(read_only=True)

    class Meta:
        model = NewsArticle
        fields = (
            "id",
            "slug",
            "title",
            "excerpt",
            "body",
            "status",
            "author",
            "published_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class NewsArticleManageSerializer(serializers.ModelSerializer):
    author = NewsAuthorSerializer(read_only=True)

    class Meta:
        model = NewsArticle
        fields = (
            "id",
            "slug",
            "title",
            "excerpt",
            "body",
            "status",
            "author",
            "published_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "author",
            "published_at",
            "created_at",
            "updated_at",
        )

    def validate_status(self, value: str) -> str:
        if value not in NewsArticle.Status.values:
            raise serializers.ValidationError("Invalid status.")
        return value

    def create(self, validated_data: dict) -> NewsArticle:
        request = self.context["request"]
        title = validated_data["title"]
        validated_data["slug"] = NewsArticle.unique_slug_from_title(title)
        validated_data["author"] = request.user
        article = NewsArticle(**validated_data)
        if article.status == NewsArticle.Status.PUBLISHED:
            article.publish()
        article.save()
        return article

    def update(self, instance: NewsArticle, validated_data: dict) -> NewsArticle:
        new_status = validated_data.pop("status", instance.status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if new_status == NewsArticle.Status.PUBLISHED:
            instance.publish()
        else:
            instance.status = NewsArticle.Status.DRAFT

        instance.save()
        return instance


class NewsroomAccessSerializer(serializers.ModelSerializer):
    user = NewsAuthorSerializer(read_only=True)
    granted_by = NewsAuthorSerializer(read_only=True)

    class Meta:
        model = NewsroomAccess
        fields = (
            "id",
            "user",
            "can_publish",
            "can_manage_permissions",
            "granted_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class NewsroomAccessGrantSerializer(serializers.Serializer):
    email = serializers.EmailField()
    can_publish = serializers.BooleanField(default=True)
    can_manage_permissions = serializers.BooleanField(default=False)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def create(self, validated_data: dict) -> NewsroomAccess:
        request = self.context["request"]
        email = validated_data["email"]
        try:
            user = User.objects.get(email__iexact=email, deleted_at__isnull=True)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError(
                {
                    "email": (
                        "No Graft account found for this email. "
                        "They must sign in at least once before you can grant access."
                    )
                }
            ) from exc

        access, created = NewsroomAccess.objects.get_or_create(
            user=user,
            defaults={
                "can_publish": validated_data["can_publish"],
                "can_manage_permissions": validated_data["can_manage_permissions"],
                "granted_by": request.user,
            },
        )
        if not created:
            access.can_publish = validated_data["can_publish"]
            access.can_manage_permissions = validated_data["can_manage_permissions"]
            access.granted_by = request.user
            access.save(
                update_fields=[
                    "can_publish",
                    "can_manage_permissions",
                    "granted_by",
                    "updated_at",
                ]
            )
        return access


class NewsroomMeSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    can_publish = serializers.BooleanField()
    can_manage_permissions = serializers.BooleanField()
    is_bootstrap_admin = serializers.BooleanField()
    user = NewsAuthorSerializer(required=False, allow_null=True)
