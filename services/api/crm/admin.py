from django.contrib import admin
from .models import (
    Workspace, CRMProfile, RelationshipStage, Company, Contact,
    CalendarAccount, CalendarEvent, WisprConnection, WisprIngest,
    Interaction, Deal, CapitalReceipt, Pilot, InvestorProfile,
    PartnerProfile, FollowUpTask, EmailDigest, Comment
)

admin.site.register(Workspace)
admin.site.register(CRMProfile)
admin.site.register(RelationshipStage)
admin.site.register(Company)
admin.site.register(Contact)
admin.site.register(CalendarAccount)
admin.site.register(CalendarEvent)
admin.site.register(WisprConnection)
admin.site.register(WisprIngest)
admin.site.register(Interaction)
admin.site.register(Deal)
admin.site.register(CapitalReceipt)
admin.site.register(Pilot)
admin.site.register(InvestorProfile)
admin.site.register(PartnerProfile)
admin.site.register(FollowUpTask)
admin.site.register(EmailDigest)
admin.site.register(Comment)
