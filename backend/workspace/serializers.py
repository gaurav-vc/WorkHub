from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

from django.utils import timezone
from .models import TeamActivity, QuickLink

class TeamActivitySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = TeamActivity
        fields = ['id', 'user', 'initials', 'action', 'target', 'time']

    def get_user(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_initials(self, obj):
        name = obj.user.get_full_name()
        if name:
            parts = name.split()
            return ''.join(p[0] for p in parts[:2]).upper()
        return obj.user.username[:2].upper()

    def get_time(self, obj):
        now = timezone.now()
        diff = now - obj.created_at
        total_seconds = int(diff.total_seconds())
        if total_seconds < 60:
            return 'just now'
        elif total_seconds < 3600:
            return f"{total_seconds // 60}m ago"
        elif total_seconds < 86400:
            return f"{total_seconds // 3600}h ago"
        return f"{diff.days}d ago"

class QuickLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickLink
        fields = ['id', 'label', 'url']
