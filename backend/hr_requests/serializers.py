from rest_framework import serializers
from .models import HRRequest, HRRequestLog
from .utils import get_hr_permissions, get_team_users

class HRRequestLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(format="%b %d, %Y %I:%M %p")

    class Meta:
        model = HRRequestLog
        fields = ['id', 'action', 'actor_name', 'note', 'timestamp']

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip() or obj.actor.username
        return "System"

class HRRequestSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    is_requester = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    logs = HRRequestLogSerializer(many=True, read_only=True)

    class Meta:
        model = HRRequest
        # We match your React interface exactly!
        fields = ['id', 'title', 'type', 'detail', 'status', 'date', 'form_data', 'requester_name', 'logs', 'is_requester', 'can_approve']

    def get_is_requester(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.user == request.user
        return False

    def get_can_approve(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
            
        user = request.user
        
        if user.is_superuser:
            return True

        try:
            profile = getattr(user, 'auth_profile', None)
            if profile and profile.role_relationship and profile.role_relationship.can_approve:
                return True
        except Exception:
            pass

        perms = get_hr_permissions(user)
        if perms.get('edit') == 'all' or perms.get('view') == 'all':
            return True
            
        if perms.get('edit') == 'team':
            team_users = get_team_users(user)
            if obj.user and team_users.filter(id=obj.user.id).exists():
                return True

        return False

    def get_date(self, obj):
        # Formats the date like "Feb 24, 2026"
        return obj.created_at.strftime("%b %d, %Y")

    def get_requester_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Unknown User"

from .models import Approval

class ApprovalSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = ['id', 'type', 'requester', 'detail', 'status']

    def get_requester(self, obj):
        return obj.requester.get_full_name() or obj.requester.username

    def get_type(self, obj):
        return obj.approval_type