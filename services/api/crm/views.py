from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from crm.workspace import get_workspace_for_user
from .models import (
    Workspace, CRMProfile, RelationshipStage, Company, Contact,
    Interaction, Deal, Pilot, InvestorProfile, PartnerProfile,
    FollowUpTask, WisprConnection, WisprIngest, CalendarAccount,
    CalendarEvent, CapitalReceipt, EmailDigest, Comment
)
from .serializers import (
    WorkspaceSerializer, CRMProfileSerializer, RelationshipStageSerializer,
    CompanySerializer, ContactSerializer, InteractionSerializer,
    DealSerializer, PilotSerializer, InvestorProfileSerializer,
    PartnerProfileSerializer, FollowUpTaskSerializer, WisprConnectionSerializer,
    WisprIngestSerializer, CalendarAccountSerializer, CalendarEventSerializer,
    CapitalReceiptSerializer, EmailDigestSerializer, CommentSerializer
)

class BaseCRMViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_workspace(self):
        return get_workspace_for_user(self.request.user)

class WorkspaceViewSet(BaseCRMViewSet):
    serializer_class = WorkspaceSerializer
    def get_queryset(self):
        return Workspace.objects.filter(id=self.get_workspace().id)

class CRMProfileViewSet(BaseCRMViewSet):
    serializer_class = CRMProfileSerializer
    def get_queryset(self):
        return CRMProfile.objects.filter(workspace=self.get_workspace())

class RelationshipStageViewSet(BaseCRMViewSet):
    serializer_class = RelationshipStageSerializer
    def get_queryset(self):
        return RelationshipStage.objects.filter(workspace=self.get_workspace())

class CompanyViewSet(BaseCRMViewSet):
    serializer_class = CompanySerializer
    def get_queryset(self):
        return Company.objects.filter(workspace=self.get_workspace())

    @action(detail=False, methods=["get"], url_path="options")
    def options(self, request):
        qs = self.get_queryset().order_by("name")
        return Response([{"id": str(c.id), "name": c.name} for c in qs])

    @action(detail=False, methods=["get"], url_path="tags")
    def tags(self, request):
        tags: set[str] = set()
        for company in self.get_queryset().only("tags"):
            raw = company.tags if isinstance(company.tags, list) else []
            for tag in raw:
                if isinstance(tag, str) and tag.strip():
                    tags.add(tag.strip())
        return Response(sorted(tags, key=str.lower))

class ContactViewSet(BaseCRMViewSet):
    serializer_class = ContactSerializer
    def get_queryset(self):
        qs = Contact.objects.filter(company__workspace=self.get_workspace())
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs

class InteractionViewSet(BaseCRMViewSet):
    serializer_class = InteractionSerializer
    def get_queryset(self):
        qs = Interaction.objects.filter(company__workspace=self.get_workspace())
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs

    @action(detail=False, methods=['post'])
    def structure(self, request):
        return Response({
            "provider": "heuristic",
            "summary": "Sample summary from CRM",
            "needsBullets": ["Sample need 1", "Sample need 2"],
            "suggestedTasks": [
                {"title": "Follow up", "description": "Send a follow up email", "dueInDays": 3}
            ],
            "interactionType": "note",
            "stageHint": None,
            "tagHints": ["follow-up"]
        })

class DealViewSet(BaseCRMViewSet):
    serializer_class = DealSerializer
    def get_queryset(self):
        qs = Deal.objects.filter(workspace=self.get_workspace())
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs

class PilotViewSet(BaseCRMViewSet):
    serializer_class = PilotSerializer
    def get_queryset(self):
        qs = Pilot.objects.filter(company__workspace=self.get_workspace())
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs

class InvestorProfileViewSet(BaseCRMViewSet):
    serializer_class = InvestorProfileSerializer
    lookup_field = 'company_id'
    def get_queryset(self):
        return InvestorProfile.objects.filter(company__workspace=self.get_workspace())

class PartnerProfileViewSet(BaseCRMViewSet):
    serializer_class = PartnerProfileSerializer
    lookup_field = 'company_id'
    def get_queryset(self):
        return PartnerProfile.objects.filter(company__workspace=self.get_workspace())

class FollowUpTaskViewSet(BaseCRMViewSet):
    serializer_class = FollowUpTaskSerializer
    def get_queryset(self):
        workspace = self.get_workspace()
        qs = FollowUpTask.objects.filter(company__workspace=workspace)
        
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
            
        view = self.request.query_params.get('view')
        user_id = self.request.query_params.get('user_id')
        
        if view == 'my' and user_id:
            qs = qs.filter(owner__user__clerk_user_id=user_id, status='open')
        elif view == 'overdue':
            qs = qs.filter(due_at__lt=timezone.now(), status='open')
        elif view == 'unassigned':
            qs = qs.filter(owner__isnull=True, status='open')
            
        return qs

    @action(detail=False, methods=['get'])
    def counts(self, request):
        workspace = self.get_workspace()
        base_qs = FollowUpTask.objects.filter(company__workspace=workspace, status='open')
        user_id = request.query_params.get('user_id')
        
        return Response({
            "my": base_qs.filter(owner__user__clerk_user_id=user_id).count() if user_id else 0,
            "overdue": base_qs.filter(due_at__lt=timezone.now()).count(),
            "today": base_qs.filter(due_at__date=timezone.now().date()).count(),
            "week": base_qs.filter(due_at__lte=timezone.now() + timedelta(days=7)).count(),
            "unassigned": base_qs.filter(owner__isnull=True).count()
        })

class WisprConnectionViewSet(BaseCRMViewSet):
    serializer_class = WisprConnectionSerializer
    def get_queryset(self):
        qs = WisprConnection.objects.filter(user__workspace=self.get_workspace())
        clerk_id = self.request.query_params.get("clerk_user_id")
        if clerk_id:
            qs = qs.filter(user__user__clerk_user_id=clerk_id)
        return qs

    @action(detail=False, methods=['post'])
    def connect_demo(self, request):
        return Response({"status": "ok"})

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        return Response({"status": "ok"})

class WisprIngestViewSet(BaseCRMViewSet):
    serializer_class = WisprIngestSerializer
    def get_queryset(self):
        qs = WisprIngest.objects.filter(workspace=self.get_workspace())
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

class CalendarAccountViewSet(BaseCRMViewSet):
    serializer_class = CalendarAccountSerializer
    def get_queryset(self):
        return CalendarAccount.objects.filter(user__workspace=self.get_workspace())

    @action(detail=False, methods=['post'])
    def connect_demo(self, request):
        return Response({"status": "ok"})

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        return Response({"status": "ok"})

class CalendarEventViewSet(BaseCRMViewSet):
    serializer_class = CalendarEventSerializer
    def get_queryset(self):
        return CalendarEvent.objects.filter(workspace=self.get_workspace())

    @action(detail=False, methods=["get"], url_path="suggest")
    def suggest(self, request):
        return Response(None)

    @action(detail=False, methods=["post"], url_path="schedule_google")
    def schedule_google(self, request):
        return Response({"status": "ok", "id": None})

    @action(detail=True, methods=['patch'])
    def confirm_link(self, request, pk=None):
        return Response({"status": "ok"})

    @action(detail=True, methods=['patch'])
    def skip(self, request, pk=None):
        return Response({"status": "ok"})

    @action(detail=True, methods=['post'])
    def log_meeting(self, request, pk=None):
        return Response({"status": "ok"})

class CapitalReceiptViewSet(BaseCRMViewSet):
    serializer_class = CapitalReceiptSerializer
    def get_queryset(self):
        return CapitalReceipt.objects.filter(workspace=self.get_workspace())

class EmailDigestViewSet(BaseCRMViewSet):
    serializer_class = EmailDigestSerializer
    def get_queryset(self):
        return EmailDigest.objects.filter(workspace=self.get_workspace())

    @action(detail=False, methods=['post'])
    def send_test(self, request):
        return Response({"status": "ok"})

    @action(detail=False, methods=['post'])
    def run_daily(self, request):
        return Response({"status": "ok"})

class CommentViewSet(BaseCRMViewSet):
    serializer_class = CommentSerializer

    def get_queryset(self):
        qs = Comment.objects.filter(workspace=self.get_workspace()).select_related(
            'author__user', 'interaction', 'company',
        )
        company_id = self.request.query_params.get('company_id')
        if company_id:
            qs = qs.filter(company_id=company_id)
        interaction_id = self.request.query_params.get('interaction_id')
        if interaction_id:
            qs = qs.filter(interaction_id=interaction_id)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        user = self.request.user
        profile = getattr(user, 'crm_profile', None)
        if profile is None:
            from crm.workspace import get_workspace_for_user
            get_workspace_for_user(user)
            profile = user.crm_profile
        serializer.save(workspace=workspace, author=profile)
