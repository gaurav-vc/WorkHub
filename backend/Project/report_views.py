from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
import datetime
from .models import Task
from django.contrib.auth.models import User

def has_reports_access(user):
    print(f"DEBUG has_reports_access: Checking user {user.username} (superuser: {user.is_superuser})")
    if user.is_superuser:
        return True
    try:
        profile = getattr(user, 'auth_profile', None)
        print(f"DEBUG: profile: {profile}, user_type: {profile.user_type if profile else 'None'}")
        if profile and profile.user_type in ['site_admin', 'super_user']:
            return True
            
        # Check RBAC
        role = 'user'
        if profile:
            if profile.role_relationship:
                role = profile.role_relationship.name.lower()
            elif profile.user_type and profile.user_type not in ['employee']:
                role = profile.user_type
            
        if role == 'user' or role == 'employee':
            emp_profile = getattr(user, 'res_employee', None)
            if emp_profile and emp_profile.role:
                from role_base_access.models import Role as RBACRole
                rbac_role = RBACRole.objects.filter(code__iexact=emp_profile.role).first()
                if rbac_role:
                    role = rbac_role.name.lower()
                else:
                    role = emp_profile.role.lower()
                    
        print(f"DEBUG: Resolved role is {role}")
        from role_base_access.models import RoleAccessMapping
        # RoleAccessMapping is a TenantModel. Does the user have the right site?
        mappings = RoleAccessMapping.objects.filter(role=role, frontend_site_id='admin-reports')
        print(f"DEBUG: Mappings with frontend_site_id='admin-reports': {mappings.count()}")
        if not mappings.exists():
            mappings = RoleAccessMapping.objects.filter(role=role, site_name='/reports')
            print(f"DEBUG: Mappings with site_name='/reports': {mappings.count()}")
            
        if mappings.exists():
            mapping = mappings.first()
            print(f"DEBUG: First mapping permissions: {mapping.permissions}")
            if mapping.permissions.get('view') is True:
                return True
                
    except Exception as e:
        print(f"DEBUG: Exception in has_reports_access: {e}")
        pass
    print("DEBUG: Returning False")
    return False

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_stats_report(request):
    if not has_reports_access(request.user):
        return Response({"error": "Unauthorized. Site Admin access required."}, status=403)
        
    employee_ids = request.query_params.get('employee_ids') or request.query_params.get('employee_id')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    quick_filter = request.query_params.get('quick_filter')
    
    if not employee_ids:
        return Response({"error": "employee_ids is required."}, status=400)
        
    ids_list = [int(eid.strip()) for eid in employee_ids.split(',') if eid.strip().isdigit()]
    if not ids_list:
        return Response({"error": "Invalid employee IDs."}, status=400)
        
    employees = User.objects.filter(id__in=ids_list)
    if not employees.exists():
        return Response({"error": "Employees not found."}, status=404)
        
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
            
    # Base queries for employee tasks: assigned to employee (single or multi-assignees), created by employee, or both
    base_assigned = Task.objects.filter(Q(assigned_to__in=employees) | Q(assignees__in=employees)).distinct()
    base_created = Task.objects.filter(created_by__in=employees).distinct()
    base_all = Task.objects.filter(Q(assigned_to__in=employees) | Q(assignees__in=employees) | Q(created_by__in=employees)).distinct()
    
    if start_date:
        assigned_tasks = base_assigned.filter(
            Q(created_at__date__gte=start_date, created_at__date__lte=end_date) |
            Q(completion_date__date__gte=start_date, completion_date__date__lte=end_date)
        )
        created_tasks = base_created.filter(
            created_at__date__gte=start_date, created_at__date__lte=end_date
        )
        all_tasks = base_all.filter(
            Q(created_at__date__gte=start_date, created_at__date__lte=end_date) |
            Q(completion_date__date__gte=start_date, completion_date__date__lte=end_date)
        )
    else:
        assigned_tasks = base_assigned
        created_tasks = base_created
        all_tasks = base_all
        
    strictly_assigned = assigned_tasks.count()
    total_created = created_tasks.count()
    total_volume = all_tasks.count()
    
    # Completed: status is 'done' or 'completed'
    completed_tasks = all_tasks.filter(status__in=['done', 'completed'])
    total_completed = completed_tasks.count()
    
    # Delayed: due_date < today and not completed, or status is 'delayed'
    total_delayed = all_tasks.filter(
        Q(due_date__lt=today, status__in=['pending', 'in_progress', 'todo', 'in-progress']) |
        Q(status='delayed')
    ).count()
    
    # Issues/Blocked: status is 'blocked' or 'issues'
    total_issues = all_tasks.filter(status__in=['blocked', 'issues', 'issue']).count()
    
    # Trend Data: group completed tasks by real-time completion date
    trend_data = {}
    if start_date:
        current = start_date
        while current <= end_date:
            trend_data[current.strftime('%Y-%m-%d')] = 0
            current += datetime.timedelta(days=1)
            
        for t in completed_tasks:
            comp_dt = t.completion_date or t.created_at
            d = comp_dt.date().strftime('%Y-%m-%d')
            if d in trend_data:
                trend_data[d] += 1
                
    formatted_trend = [{"date": k, "completed": v} for k, v in sorted(trend_data.items())]
    
    from datetime import timezone as dt_tz
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

    def format_ist(dt):
        if not dt:
            return None
        try:
            # Ensure datetime is aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_tz.utc)
            local_dt = dt.astimezone(IST)
            return local_dt.strftime('%Y-%m-%d %I:%M:%S %p')
        except Exception:
            return dt.strftime('%Y-%m-%d %I:%M:%S %p') if dt else None

    # Raw tasks for table
    raw_tasks = []
    for t in all_tasks.select_related('project', 'assigned_to', 'created_by').prefetch_related('assignees').order_by('-created_at')[:100]:
        comp_str = format_ist(t.completion_date)
        started_str = format_ist(t.started_at)
        
        # Real-time status change time
        if t.status in ['done', 'completed'] and t.completion_date:
            status_change_time = format_ist(t.completion_date)
        elif t.status in ['in_progress', 'in-progress'] and t.started_at:
            status_change_time = format_ist(t.started_at)
        else:
            status_change_time = format_ist(t.created_at)

        task_logs = [
            {
                "event": "Task Created",
                "timestamp": format_ist(t.created_at),
                "actor": t.created_by.get_full_name() or t.created_by.username if t.created_by else "System"
            }
        ]
        if t.started_at:
            task_logs.append({
                "event": "Task Started (In Progress)",
                "timestamp": format_ist(t.started_at),
                "actor": t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else "Assignee"
            })
        if t.completion_date:
            task_logs.append({
                "event": "Task Completed",
                "timestamp": format_ist(t.completion_date),
                "actor": t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else "Assignee"
            })

        assignee_names = []
        if t.assigned_to:
            assignee_names.append(t.assigned_to.get_full_name() or t.assigned_to.username)
        for a in t.assignees.all():
            a_name = a.get_full_name() or a.username
            if a_name not in assignee_names:
                assignee_names.append(a_name)
        assignee_display = ", ".join(assignee_names) if assignee_names else "Unassigned"

        raw_tasks.append({
            "id": t.id,
            "title": t.title,
            "project": t.project.name if t.project else None,
            "project_id": t.project.id if t.project else None,
            "assignee": assignee_display,
            "created_by": t.created_by.get_full_name() or t.created_by.username if t.created_by else "Unassigned",
            "is_created_by_employee": bool(t.created_by and t.created_by in employees),
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.strftime('%Y-%m-%d') if t.due_date else None,
            "created_at": t.created_at.strftime('%Y-%m-%d'),
            "created_at_time": t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "completed_at": comp_str,
            "completed_date": t.completion_date.strftime('%Y-%m-%d') if t.completion_date else None,
            "started_at": started_str,
            "status_change_time": status_change_time,
            "logs": task_logs
        })
        
    activity_logs = []
    try:
        from workspace.models import TeamActivity
        activities = TeamActivity.objects.filter(user__in=employees).order_by('-created_at')[:50]
        for act in activities:
            activity_logs.append({
                "id": act.id,
                "user": act.user.get_full_name() or act.user.username,
                "action": act.action,
                "target": act.target,
                "timestamp": act.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                "date": act.created_at.strftime('%Y-%m-%d')
            })
    except Exception:
        pass

    if employees.count() == 1:
        emp = employees.first()
        emp_data = {
            "id": emp.id,
            "name": emp.get_full_name() or emp.username,
            "email": emp.email
        }
    else:
        emp_data = {
            "id": -1,
            "name": "Multiple Employees",
            "email": ""
        }
        
    return Response({
        "employee": emp_data,
        "kpis": {
            "total_volume": total_volume,
            "total_assigned": total_volume,
            "strictly_assigned": strictly_assigned,
            "total_created": total_created,
            "total_completed": total_completed,
            "total_delayed": total_delayed,
            "total_issues": total_issues
        },
        "trend_data": formatted_trend,
        "raw_tasks": raw_tasks,
        "activity_logs": activity_logs
    })
