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
        # Formats like "Jan 2026" to match your UI perfectly
        return obj.updated_at.strftime("%b %Y")

    def get_created_at_formatted(self, obj):
        return obj.updated_at.strftime("%b %d, %Y %I:%M %p")