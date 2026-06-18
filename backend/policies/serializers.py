from rest_framework import serializers
from .models import Policy

class PolicySerializer(serializers.ModelSerializer):
    lastUpdated = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        # Matching React interface keys
        fields = ['id', 'title', 'category', 'version', 'content', 'lastUpdated']

    def get_lastUpdated(self, obj):
        # Formats like "Jan 2026" to match your UI perfectly
        return obj.updated_at.strftime("%b %Y")