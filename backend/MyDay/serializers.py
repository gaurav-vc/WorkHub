from rest_framework import serializers
from authentication.models import UserProfile
from Project.models import Task
from calendar_meeting.models import Meeting
from workspace.models import TeamActivity, QuickLink
from hr_requests.models import Approval
from django.utils import timezone

class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    class Meta:
        model = UserProfile
        fields = ['name', 'role', 'avatar_initials', 'leave_balance']
    def get_name(self, obj): return obj.user.get_full_name() or obj.user.username

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    class Meta:
        model = Task
        fields = ['id', 'title', 'project', 'priority', 'status', 'due_date']
    def get_project(self, obj): return obj.project.name

class MeetingSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()
    class Meta:
        model = Meeting
        fields = ['id', 'title', 'time', 'duration', 'attendees', 'meeting_type']
    def get_time(self, obj): return timezone.localtime(obj.meeting_time).strftime('%I:%M %p')
    def get_attendees(self, obj):
        count = obj.attendees.count()
        if obj.external_attendees:
            count += len([e for e in obj.external_attendees.split(',') if e.strip()])
        return count

class TeamActivitySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    class Meta:
        model = TeamActivity
        fields = ['id', 'user', 'action', 'target']
    def get_user(self, obj): return obj.user.get_full_name() or obj.user.username

class ApprovalSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    class Meta:
        model = Approval
        fields = ['id', 'approval_type', 'requester', 'detail', 'status']
    def get_requester(self, obj): return obj.requester.get_full_name() or obj.requester.username

class QuickLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickLink
        fields = ['id', 'label', 'url']