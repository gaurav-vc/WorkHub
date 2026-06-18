from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically filters querysets to the user's organization
    and auto-assigns the organization upon creation.
    """
    
    def get_organization(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return None
        
        try:
            profile = getattr(user, 'auth_profile', None)
            if profile and profile.user_type == 'super_user':
                return None 
                
            org_profile = getattr(user, 'org_profile', None)
            if org_profile and org_profile.organization:
                return org_profile.organization
        except Exception:
            pass
            
        return None

    def get_queryset(self):
        queryset = super().get_queryset()
        org = self.get_organization()
        
        user = self.request.user
        profile = getattr(user, 'auth_profile', None)
        if profile and profile.user_type == 'super_user':
            return queryset.none()
            
        if not org:
            return queryset.none()
            
        return queryset.filter(organization=org)

    def perform_create(self, serializer, **kwargs):
        org = self.get_organization()
        user = self.request.user
        profile = getattr(user, 'auth_profile', None)
        
        if profile and profile.user_type == 'super_user':
            raise PermissionDenied("Super Admins cannot create tenant-specific records.")
            
        if not org:
            raise PermissionDenied("You must belong to an organization to create records.")
            
        serializer.save(organization=org, **kwargs)

from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone
from django.contrib.auth.models import User
from Project.models import Task
from calendar_meeting.models import Meeting
from hr_requests.models import Approval

@api_view(['GET'])
def home(request):
    return Response({"message": "Backend connected successfully"})

@api_view(['GET'])
def debug(request):
    today = timezone.now().date()
    user_id = request.query_params.get('user_id', 1)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"})

    return Response({
        "user": user.username,
        "today": str(today),
        "all_tasks": Task.objects.count(),
        "tasks_assigned_to_user": Task.objects.filter(assigned_to=user).count(),
        "tasks_due_today": Task.objects.filter(assigned_to=user, due_date=today).count(),
        "all_meetings": Meeting.objects.count(),
        "meetings_for_user": Meeting.objects.filter(attendees=user).count(),
        "all_approvals": Approval.objects.count(),
        "approvals_for_user": Approval.objects.filter(approver=user, status='pending').count(),
        "has_profile": hasattr(user, 'profile'),
    })
