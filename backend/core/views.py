from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically filters querysets to the user's organization
    and auto-assigns the organization upon creation.
    """
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_organization(self):
        from core.tenant import get_current_organization
        org = get_current_organization()
        if not org and hasattr(self, 'request') and self.request.user and self.request.user.is_authenticated:
            try:
                user = self.request.user
                org_profile = getattr(user, 'org_profile', None)
                if org_profile and org_profile.organization:
                    return org_profile.organization
                from organization.models import Organization
                return Organization.objects.filter(members=user).first() or Organization.objects.filter(created_by=user).first() or Organization.objects.first()
            except Exception:
                pass
        return org

    def get_queryset(self):
        queryset = super().get_queryset()
        org = self.get_organization()
        
        user = self.request.user
        profile = getattr(user, 'auth_profile', None)
        if user.is_superuser or (profile and profile.user_type == 'super_user'):
            # Super admins see all records (unfiltered)
            return queryset
            
        if not org:
            return queryset.none()
            
        qs = queryset.filter(organization=org)
        
        # Enforce site isolation allowing site or general workspace (site__isnull=True)
        from core.tenant import get_current_site
        site = get_current_site()
        user_type = getattr(profile, 'user_type', 'employee') if profile else 'employee'
        
        if user_type in ['employee', 'site_admin']:
            from django.db.models import Q
            if site:
                qs = qs.filter(Q(site=site) | Q(site__isnull=True))
            else:
                qs = qs.filter(site__isnull=True)
                
        return qs

    def perform_create(self, serializer, **kwargs):
        org = self.get_organization()
        user = self.request.user
        
        if not org:
            raise PermissionDenied("You must belong to an organization to create records.")
            
        from core.tenant import get_current_site
        site = get_current_site()
            
        serializer.save(organization=org, site=site, **kwargs)

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


@api_view(['GET'])
def api_documentation(request):
    """
    Public API specification and endpoint directory.
    Accessible without authentication on live servers and localhost.
    """
    host = request.build_absolute_uri('/')[:-1]
    return Response({
        "name": "WorkHub Enterprise REST API",
        "version": "2.4.0",
        "status": "online",
        "base_url": f"{host}/api",
        "interactive_docs": f"{host}/api/docs",
        "postman_collection": f"{host}/postman_collection.json",
        "endpoints": {
            "authentication": {
                "login": f"{host}/api/auth/login/",
                "register": f"{host}/api/auth/register/",
                "me": f"{host}/api/auth/me/",
                "logout": f"{host}/api/auth/logout/"
            },
            "tasks": {
                "list": f"{host}/api/tasks/",
                "create": f"{host}/api/tasks/",
                "detail": f"{host}/api/tasks/{{id}}/",
                "partial_update": f"{host}/api/tasks/{{id}}/"
            },
            "projects": {
                "list": f"{host}/api/projects/",
                "create": f"{host}/api/projects/create/",
                "detail": f"{host}/api/projects/{{id}}/"
            },
            "chat": {
                "channels": f"{host}/api/chat/channels/",
                "messages": f"{host}/api/chat/messages/?channel_id={{channel_id}}",
                "send_message": f"{host}/api/chat/messages/"
            },
            "custom_boards": {
                "boards": f"{host}/api/boards/"
            },
            "calendar": {
                "meetings": f"{host}/api/calendar/meetings/"
            },
            "workflows": {
                "list": f"{host}/api/workflows/"
            },
            "hr": {
                "requests": f"{host}/api/hr/requests/",
                "directory": f"{host}/api/directory/"
            }
        }
    })
