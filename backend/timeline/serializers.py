# backend/timeline/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Employee
from boards.models import Card

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'initials', 'role']


class GanttTaskSerializer(serializers.ModelSerializer):
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        write_only=True,
        allow_null=True,
        required=False
    )
    assignee = serializers.PrimaryKeyRelatedField(read_only=True)
    assignee_name = serializers.SerializerMethodField()
    assignee_initials = serializers.SerializerMethodField()
    dependency_id = serializers.SerializerMethodField()
    # To keep frontend consistent, map priority and due_date to defaults if not provided from Timeline
    # The frontend form doesn't send priority or due_date.

    class Meta:
        model = Card
        fields = [
            'id', 'title', 'assignee', 'assignee_id', 'assignee_name',
            'assignee_initials', 'start_day', 'duration',
            'color', 'status', 'dependency_id'
        ]

    def get_assignee_name(self, obj):
        if obj.assignee:
            return obj.assignee.get_full_name() or obj.assignee.username
        return "Unassigned"

    def get_assignee_initials(self, obj):
        if obj.assignee:
            name = obj.assignee.get_full_name() or obj.assignee.username
            parts = name.split()
            return ''.join(p[0] for p in parts[:2]).upper() if parts else "??"
        return "??"

    def get_dependency_id(self, obj):
        return obj.dependency.id if obj.dependency else None