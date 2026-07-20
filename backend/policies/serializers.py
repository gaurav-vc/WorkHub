from rest_framework import serializers
from .models import Policy

class PolicySerializer(serializers.ModelSerializer):
    lastUpdated = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        # Matching React interface keys
        fields = ['id', 'title', 'category', 'version', 'content', 'lastUpdated', 'attachment', 'created_at_formatted']

    def get_lastUpdated(self, obj):
        return obj.updated_at.isoformat()

    def get_created_at_formatted(self, obj):
        # Fallback to updated_at if created_at doesn't exist for some reason
        dt = getattr(obj, 'created_at', obj.updated_at)
        return dt.isoformat()