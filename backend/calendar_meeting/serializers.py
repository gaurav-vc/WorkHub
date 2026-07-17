from rest_framework import serializers
from django.utils import timezone
from .models import Meeting

class MeetingSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = ['id', 'title', 'time', 'duration', 'attendees', 'type', 'meeting_link']

    def get_time(self, obj):
        return obj.meeting_time.isoformat()

    def get_attendees(self, obj):
        return obj.attendees.count()

    def get_type(self, obj):
        return obj.meeting_type
