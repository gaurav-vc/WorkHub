from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
import datetime
from .models import Task
from django.contrib.auth.models import User

def is_site_admin(user):
    if user.is_superuser:
        return True
    try:
        profile = getattr(user, 'auth_profile', None)
        return profile and profile.user_type in ['site_admin', 'super_user']
    except Exception:
        return False

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_stats_report(request):
    if not is_site_admin(request.user):
        return Response({"error": "Unauthorized. Site Admin access required."}, status=403)
        
    employee_id = request.query_params.get('employee_id')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    quick_filter = request.query_params.get('quick_filter')
    
    if not employee_id:
        return Response({"error": "employee_id is required."}, status=400)
        
    try:
        employee = User.objects.get(id=employee_id)
    except User.DoesNotExist:
        return Response({"error": "Employee not found."}, status=404)
        
    today = timezone.now().date()
    start_date = None
    end_date = today
    
    if quick_filter == '30d':
        start_date = today - datetime.timedelta(days=30)
    elif quick_filter == '6m':
        start_date = today - datetime.timedelta(days=180)
    elif quick_filter == '1y':
        start_date = today - datetime.timedelta(days=365)
    elif start_date_str and end_date_str:
        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
            
    # Base query for tasks assigned to the employee
    assigned_tasks = Task.objects.filter(assigned_to=employee)
    created_tasks = Task.objects.filter(created_by=employee)
    
    if start_date:
        assigned_tasks = assigned_tasks.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        created_tasks = created_tasks.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        
    total_assigned = assigned_tasks.count()
    total_created = created_tasks.count()
    
    # Completed: status is 'done' or 'completed'
    completed_tasks = assigned_tasks.filter(status__in=['done', 'completed'])
    total_completed = completed_tasks.count()
    
    # Delayed: due_date < today and not completed, or status is 'delayed'
    total_delayed = assigned_tasks.filter(
        Q(due_date__lt=today, status__in=['pending', 'in_progress', 'todo', 'in-progress']) |
        Q(status='delayed')
    ).count()
    
    # Issues/Blocked: status is 'blocked' or 'issues'
    total_issues = assigned_tasks.filter(status__in=['blocked', 'issues', 'issue']).count()
    
    # Trend Data: group completed tasks by date (last 30 days)
    # We will just fetch them and group in python for simplicity
    trend_data = {}
    if start_date:
        current = start_date
        while current <= end_date:
            trend_data[current.strftime('%Y-%m-%d')] = 0
            current += datetime.timedelta(days=1)
            
        for t in completed_tasks:
            # Assuming tasks have updated_at or we use created_at for trend (ideally completed_date)
            # We'll use due_date or created_at since completed_date might not exist
            d = t.created_at.date().strftime('%Y-%m-%d')
            if d in trend_data:
                trend_data[d] += 1
                
    formatted_trend = [{"date": k, "completed": v} for k, v in sorted(trend_data.items())]
    
    # Raw tasks for table
    raw_tasks = []
    for t in assigned_tasks.order_by('-created_at')[:50]: # Limit to 50 for performance
        raw_tasks.append({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.strftime('%Y-%m-%d') if t.due_date else None,
            "created_at": t.created_at.strftime('%Y-%m-%d')
        })
        
    return Response({
        "employee": {
            "id": employee.id,
            "name": employee.get_full_name() or employee.username,
            "email": employee.email
        },
        "kpis": {
            "total_assigned": total_assigned,
            "total_created": total_created,
            "total_completed": total_completed,
            "total_delayed": total_delayed,
            "total_issues": total_issues
        },
        "trend_data": formatted_trend,
        "raw_tasks": raw_tasks
    })
