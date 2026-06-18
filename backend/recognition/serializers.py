from rest_framework import serializers
from .models import Kudos, Birthday
from django.utils.timezone import now

class KudosSerializer(serializers.ModelSerializer):
    # Mapping to exact React interface keys
    fromName = serializers.CharField(source='from_name')
    fromInitials = serializers.CharField(source='from_initials')
    toName = serializers.CharField(source='to_name')
    toInitials = serializers.CharField(source='to_initials')
    time = serializers.SerializerMethodField()

    class Meta:
        model = Kudos
        fields = [
            'id', 'fromName', 'fromInitials', 'toName', 'toInitials', 
            'message', 'category', 'reactions', 'time'
        ]

    def get_time(self, obj):
        # A simple formatter to return "X days ago" or "Today"
        delta = now() - obj.created_at
        if delta.days == 0:
            return "Today"
        return f"{delta.days}d ago"

class BirthdaySerializer(serializers.ModelSerializer):
    date = serializers.CharField(source='date_string')
    day = serializers.IntegerField(source='day_number')

    class Meta:
        model = Birthday
        fields = ['id', 'name', 'initials', 'department', 'date', 'day']