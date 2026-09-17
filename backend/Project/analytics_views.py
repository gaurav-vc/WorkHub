from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Project
from core.utils import get_visible_users

def map_status(s):
    s = (s or 'pending').lower()
    if s in ('done', 'completed', 'closed'): return 'completed'
    if s in ('in_progress', 'in-progress', 'wip', 'started', 'review'): return 'in_progress'
    return 'open'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projects_analytics_all(request):
    visible_users = get_visible_users(request.user)
    
    # Filter projects based on user access
    user_dept = ""
    try:
        profile = getattr(request.user, 'auth_profile', None)
        if profile and profile.role_relationship:
            user_dept = profile.role_relationship.name
    except Exception:
        pass

    base_q = Q(created_by__in=visible_users)
    scope_q = Q(department__in=['all', 'Entire Organization', ''])
    scope_q |= Q(created_by=request.user)
    if user_dept:
        scope_q |= Q(department__iexact=user_dept)
        
    projects = Project.objects.filter(base_q & scope_q).exclude(name__iexact="General Workspace").prefetch_related('api_tasks')
    
    data = []
    for p in projects:
        counts = {'completed': 0, 'in_progress': 0, 'open': 0}
        for t in p.api_tasks.all():
            s = map_status(t.status)
            counts[s] += 1
        data.append({
            'id': p.id,
            'projectName': p.name,
            'completed': counts['completed'],
            'inProgress': counts['in_progress'],
            'open': counts['open'],
        })
        
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_analytics_detail(request, project_id):
    visible_users = get_visible_users(request.user)
    user_dept = ""
    try:
        profile = getattr(request.user, 'auth_profile', None)
        if profile and profile.role_relationship:
            user_dept = profile.role_relationship.name
    except Exception:
        pass

    base_q = Q(created_by__in=visible_users)
    scope_q = Q(department__in=['all', 'Entire Organization', ''])
    scope_q |= Q(created_by=request.user)
    if user_dept:
        scope_q |= Q(department__iexact=user_dept)
        
    try:
        project = Project.objects.filter(base_q & scope_q, id=project_id).prefetch_related('api_tasks').first()
        if not project:
            return Response({"error": "Project not found or no access"}, status=404)
    except Exception:
        return Response({"error": "Project not found"}, status=404)
        
    counts = {'completed': 0, 'in_progress': 0, 'open': 0}
    for t in project.api_tasks.all():
        s = map_status(t.status)
        counts[s] += 1
        
    return Response({
        'id': project.id,
        'projectName': project.name,
        'completed': counts['completed'],
        'inProgress': counts['in_progress'],
        'open': counts['open'],
    })
