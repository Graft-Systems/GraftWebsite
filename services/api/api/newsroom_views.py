"""DRF views for the Graft newsroom."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import NewsArticle, NewsroomAccess, NewsImage
from api.newsroom_permissions import (
    IsNewsroomPermissionManager,
    IsNewsroomPublisher,
    _clerk_id_is_bootstrap_admin,
    _get_access,
    _is_authenticated_spray_user,
)
from api.newsroom_serializers import (
    NewsArticleManageSerializer,
    NewsArticlePublicSerializer,
    NewsroomAccessGrantSerializer,
    NewsroomAccessSerializer,
    NewsroomMeSerializer,
    NewsImageSerializer,
)


def _newsroom_me_payload(request) -> dict:
    user = request.user if _is_authenticated_spray_user(request) else None
    bootstrap = _clerk_id_is_bootstrap_admin(request) if user else False
    access = _get_access(request) if user else None
    can_publish = bootstrap or (access is not None and access.can_publish)
    can_manage = bootstrap or (
        access is not None and access.can_manage_permissions
    )
    payload = {
        "authenticated": user is not None,
        "can_publish": can_publish,
        "can_manage_permissions": can_manage,
        "is_bootstrap_admin": bootstrap,
        "user": user,
    }
    return NewsroomMeSerializer(payload).data


class NewsroomMeView(APIView):
    """Caller capabilities for newsroom studio UI."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_newsroom_me_payload(request))


class NewsArticlePublicListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        articles = NewsArticle.objects.filter(
            status=NewsArticle.Status.PUBLISHED
        ).select_related("author")
        data = NewsArticlePublicSerializer(articles, many=True).data
        return Response({"articles": data})


class NewsArticlePublicDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug: str):
        article = get_object_or_404(
            NewsArticle.objects.select_related("author"),
            slug=slug,
            status=NewsArticle.Status.PUBLISHED,
        )
        return Response(NewsArticlePublicSerializer(article).data)


class NewsArticleManageListCreateView(APIView):
    permission_classes = [IsNewsroomPublisher]

    def get(self, request):
        articles = NewsArticle.objects.select_related("author").order_by(
            "-updated_at"
        )
        return Response(
            {"articles": NewsArticleManageSerializer(articles, many=True).data}
        )

    def post(self, request):
        serializer = NewsArticleManageSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        article = serializer.save()
        return Response(
            NewsArticleManageSerializer(article).data,
            status=status.HTTP_201_CREATED,
        )


class NewsArticleManageDetailView(APIView):
    permission_classes = [IsNewsroomPublisher]

    def get(self, request, article_id):
        article = get_object_or_404(
            NewsArticle.objects.select_related("author"), id=article_id
        )
        return Response(NewsArticleManageSerializer(article).data)

    def patch(self, request, article_id):
        article = get_object_or_404(NewsArticle, id=article_id)
        serializer = NewsArticleManageSerializer(
            article, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        article = serializer.save()
        return Response(NewsArticleManageSerializer(article).data)

    def delete(self, request, article_id):
        article = get_object_or_404(NewsArticle, id=article_id)
        article.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NewsImageUploadView(APIView):
    permission_classes = [IsNewsroomPublisher]

    def post(self, request):
        serializer = NewsImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class NewsroomAccessListCreateView(APIView):
    permission_classes = [IsNewsroomPermissionManager]

    def get(self, request):
        grants = NewsroomAccess.objects.select_related("user", "granted_by").order_by(
            "-created_at"
        )
        return Response(
            {"publishers": NewsroomAccessSerializer(grants, many=True).data}
        )

    def post(self, request):
        serializer = NewsroomAccessGrantSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        access = serializer.save()
        return Response(
            NewsroomAccessSerializer(access).data,
            status=status.HTTP_201_CREATED,
        )


class NewsroomAccessDetailView(APIView):
    permission_classes = [IsNewsroomPermissionManager]

    def delete(self, request, access_id):
        access = get_object_or_404(NewsroomAccess, id=access_id)
        if access.user_id == request.user.id:
            return Response(
                {"detail": "You cannot revoke your own newsroom access."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        access.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
