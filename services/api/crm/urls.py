from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkspaceViewSet, CRMProfileViewSet, RelationshipStageViewSet,
    CompanyViewSet, ContactViewSet, InteractionViewSet, DealViewSet,
    PilotViewSet, InvestorProfileViewSet, PartnerProfileViewSet,
    FollowUpTaskViewSet, WisprConnectionViewSet, WisprIngestViewSet,
    CalendarAccountViewSet, CalendarEventViewSet, CapitalReceiptViewSet,
    EmailDigestViewSet, CommentViewSet
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'crm-profiles', CRMProfileViewSet, basename='crmprofile')
router.register(r'relationship-stages', RelationshipStageViewSet, basename='relationshipstage')
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'interactions', InteractionViewSet, basename='interaction')
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'pilots', PilotViewSet, basename='pilot')
router.register(r'investor-profiles', InvestorProfileViewSet, basename='investorprofile')
router.register(r'partner-profiles', PartnerProfileViewSet, basename='partnerprofile')
router.register(r'follow-up-tasks', FollowUpTaskViewSet, basename='followuptask')
router.register(r'wispr-connections', WisprConnectionViewSet, basename='wisprconnection')
router.register(r'wispr-ingests', WisprIngestViewSet, basename='wispringest')
router.register(r'calendar-accounts', CalendarAccountViewSet, basename='calendaraccount')
router.register(r'calendar-events', CalendarEventViewSet, basename='calendarevent')
router.register(r'capital-receipts', CapitalReceiptViewSet, basename='capitalreceipt')
router.register(r'email-digests', EmailDigestViewSet, basename='emaildigest')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]
