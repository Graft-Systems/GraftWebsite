import uuid
from django.db import models

class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    capital_split_buckets = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CRMProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('spray.User', on_delete=models.CASCADE, related_name='crm_profile')
    role = models.CharField(max_length=255, default="member")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} CRM Profile"

class RelationshipStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='stages')
    key = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    sort_order = models.IntegerField()

    class Meta:
        unique_together = ('workspace', 'key')

    def __str__(self):
        return self.label

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='companies')
    name = models.CharField(max_length=255)
    website = models.URLField(max_length=255, null=True, blank=True)
    domain = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    relationship_stage = models.ForeignKey(RelationshipStage, on_delete=models.SET_NULL, null=True, blank=True, related_name='companies')
    tags = models.JSONField(default=list)
    needs = models.TextField(null=True, blank=True)
    account_owner = models.ForeignKey(CRMProfile, on_delete=models.RESTRICT, related_name='owned_companies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=255, null=True, blank=True)
    linkedin_url = models.URLField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    contact_role = models.CharField(max_length=255, null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CalendarAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CRMProfile, on_delete=models.CASCADE, related_name='calendar_accounts')
    provider = models.CharField(max_length=255, default="demo")
    external_account_id = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=255, default="connected")
    access_token = models.TextField(null=True, blank=True)
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    sync_cursor = models.TextField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider', 'external_account_id')

class CalendarEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='calendar_events')
    calendar_account = models.ForeignKey(CalendarAccount, on_delete=models.CASCADE, related_name='events')
    external_id = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    location = models.CharField(max_length=255, null=True, blank=True)
    meeting_url = models.URLField(max_length=255, null=True, blank=True)
    organizer_email = models.EmailField(null=True, blank=True)
    attendees = models.JSONField(default=list)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='calendar_events')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='calendar_events')
    link_status = models.CharField(max_length=255, default="unmatched")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('calendar_account', 'external_id')

class WisprConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CRMProfile, on_delete=models.CASCADE, related_name='wispr_connection')
    provider = models.CharField(max_length=255, default="demo")
    external_user_id = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=255, default="connected")
    api_key = models.CharField(max_length=255, null=True, blank=True)
    webhook_secret = models.CharField(max_length=255, null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class WisprIngest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='wispr_ingests')
    wispr_connection = models.ForeignKey(WisprConnection, on_delete=models.CASCADE, related_name='ingests')
    external_note_id = models.CharField(max_length=255)
    received_at = models.DateTimeField(auto_now_add=True)
    raw_text = models.TextField()
    ai_summary = models.TextField(null=True, blank=True)
    ai_needs = models.JSONField(default=list)
    ai_suggested_tasks = models.JSONField(default=list)
    ai_stage_hint = models.CharField(max_length=255, null=True, blank=True)
    ai_tag_hints = models.JSONField(default=list)
    interaction_type = models.CharField(max_length=255, default="voice_note")
    suggested_company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='wispr_ingest_suggestions')
    status = models.CharField(max_length=255, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('wispr_connection', 'external_note_id')

class Interaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='interactions')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='interactions')
    type = models.CharField(max_length=255)
    occurred_at = models.DateTimeField()
    notes = models.TextField(null=True, blank=True)
    source = models.CharField(max_length=255, default="manual")
    transcript = models.TextField(null=True, blank=True)
    ai_summary = models.TextField(null=True, blank=True)
    ai_needs = models.JSONField(null=True, blank=True)
    ai_suggested_tasks = models.JSONField(null=True, blank=True)
    ai_stage_hint = models.CharField(max_length=255, null=True, blank=True)
    ai_tag_hints = models.JSONField(null=True, blank=True)
    calendar_event = models.OneToOneField(CalendarEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='interaction')
    wispr_ingest = models.OneToOneField(WisprIngest, on_delete=models.SET_NULL, null=True, blank=True, related_name='applied_interaction')
    created_by = models.ForeignKey(CRMProfile, on_delete=models.RESTRICT, related_name='created_interactions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='deals')
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    name = models.CharField(max_length=255)
    stage = models.CharField(max_length=255, default="open")
    value_estimate = models.FloatField(null=True, blank=True)
    link = models.URLField(max_length=255, null=True, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    expected_close = models.DateTimeField(null=True, blank=True)
    owner = models.ForeignKey(CRMProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_deals')
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CapitalReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='capital_receipts')
    amount = models.FloatField()
    title = models.CharField(max_length=255)
    source = models.CharField(max_length=255, default="deal")
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='capital_receipts')
    received_at = models.DateTimeField()
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(CRMProfile, on_delete=models.RESTRICT, related_name='capital_receipts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Pilot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='pilots')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='pilots')
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=255, default="planned")
    start_at = models.DateTimeField(null=True, blank=True)
    target_end_at = models.DateTimeField(null=True, blank=True)
    success_criteria = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(CRMProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_pilots')
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class InvestorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='investor_profile')
    fund_name = models.CharField(max_length=255, null=True, blank=True)
    check_size_band = models.CharField(max_length=255, null=True, blank=True)
    thesis_tags = models.JSONField(default=list)
    warm_intro_source = models.CharField(max_length=255, null=True, blank=True)
    stage = models.CharField(max_length=255, default="prospecting")
    next_step = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PartnerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='partner_profile')
    partner_type = models.CharField(max_length=255, null=True, blank=True)
    program_status = models.CharField(max_length=255, default="exploring")
    owner = models.ForeignKey(CRMProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_partners')
    integration_notes = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class FollowUpTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='follow_up_tasks')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_tasks')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_tasks')
    pilot = models.ForeignKey(Pilot, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_tasks')
    interaction = models.ForeignKey(Interaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=255, default="open")
    due_at = models.DateTimeField(null=True, blank=True)
    owner = models.ForeignKey(CRMProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_tasks')
    created_by = models.ForeignKey(CRMProfile, on_delete=models.RESTRICT, related_name='created_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EmailDigest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='email_digests')
    recipient = models.ForeignKey(CRMProfile, on_delete=models.CASCADE, related_name='email_digests')
    recipient_email = models.EmailField()
    kind = models.CharField(max_length=255, default="daily_digest")
    provider = models.CharField(max_length=255, default="outbox")
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField()
    task_ids = models.JSONField(default=list)
    meeting_ids = models.JSONField(default=list)
    task_count = models.IntegerField(default=0)
    meeting_count = models.IntegerField(default=0)
    status = models.CharField(max_length=255, default="queued")
    error = models.TextField(null=True, blank=True)
    provider_message_id = models.CharField(max_length=255, null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='comments')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='comments')
    interaction = models.ForeignKey(Interaction, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    author = models.ForeignKey(CRMProfile, on_delete=models.RESTRICT, related_name='comments')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
