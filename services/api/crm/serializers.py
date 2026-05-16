from rest_framework import serializers
from .models import (
    Workspace, CRMProfile, RelationshipStage, Company, Contact,
    Interaction, Deal, Pilot, InvestorProfile, PartnerProfile,
    FollowUpTask, WisprConnection, WisprIngest, CalendarAccount,
    CalendarEvent, CapitalReceipt, EmailDigest, Comment
)

class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = '__all__'

class CRMProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    clerk_id = serializers.CharField(source='user.clerk_user_id', read_only=True)

    class Meta:
        model = CRMProfile
        fields = ('id', 'user', 'role', 'workspace', 'name', 'email', 'clerk_id', 'created_at', 'updated_at')

class RelationshipStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RelationshipStage
        fields = '__all__'

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'

class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = '__all__'

class PilotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pilot
        fields = '__all__'

class InvestorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorProfile
        fields = '__all__'

class PartnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerProfile
        fields = '__all__'

class FollowUpTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpTask
        fields = '__all__'

class WisprConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WisprConnection
        fields = '__all__'

class WisprIngestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WisprIngest
        fields = '__all__'

class CalendarAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarAccount
        fields = '__all__'

class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = '__all__'

class CapitalReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapitalReceipt
        fields = '__all__'

class EmailDigestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDigest
        fields = '__all__'

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = '__all__'
