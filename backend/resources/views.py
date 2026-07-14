# resources/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q
from datetime import date, timedelta

from .models import Department, EmployeeProfile, ResourceTask, CapacityPlan, TimeOff, ResourceConflict
from .serializers import (
    DepartmentSerializer, EmployeeProfileSerializer, EmployeeWorkloadSerializer,
    ResourceTaskSerializer, CapacityPlanSerializer, TimeOffSerializer,
    ResourceConflictSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER — conflict detection engine
# ─────────────────────────────────────────────────────────────────────────────
def detect_and_save_conflicts():
    """
    Scans all active employees, detects conflicts, saves new ones.
    Called after every task assignment or update.
    Returns list of conflict dicts.
    """
    # Clear stale open conflicts before re-detecting
    ResourceConflict.objects.filter(resolution='open').delete()

    employees = EmployeeProfile.objects.filter(is_active=True).prefetch_related('res_tasks')
    new_conflicts = []

    for emp in employees:
        active_tasks = list(emp.res_tasks.exclude(status='done'))
        total_hours  = sum(t.effort_in_hours for t in active_tasks)
        utilization  = (total_hours / emp.weekly_capacity * 100) if emp.weekly_capacity > 0 else 0

        # Conflict 1 — Overloaded (>85 %)
        if utilization > 85:
            cf = ResourceConflict.objects.create(
                employee=emp,
                conflict_type='overloaded',
                message=(
                    f"{emp.full_name} is at {round(utilization)}% capacity — "
                    f"overallocated by {round(total_hours - emp.weekly_capacity, 1)}h this week"
                ),
            )
            cf.tasks.set(active_tasks)
            new_conflicts.append(cf)

        # Conflict 2 — Multiple urgent tasks
        urgent = [t for t in active_tasks if t.is_urgent]
        if len(urgent) > 1:
            cf = ResourceConflict.objects.create(
                employee=emp,
                conflict_type='urgent',
                message=f"{emp.full_name} has {len(urgent)} urgent tasks assigned simultaneously",
            )
            cf.tasks.set(urgent)
            new_conflicts.append(cf)

        # Conflict 3 — Overlapping deadlines within 2 days
        dated = sorted([t for t in active_tasks if t.due_date], key=lambda t: t.due_date)
        for i in range(len(dated) - 1):
            gap = (dated[i + 1].due_date - dated[i].due_date).days
            if gap <= 2:
                cf = ResourceConflict.objects.create(
                    employee=emp,
                    conflict_type='deadline',
                    message=(
                        f"{emp.full_name} has overlapping deadlines: "
                        f"'{dated[i].title}' and '{dated[i+1].title}' are {gap}d apart"
                    ),
                )
                cf.tasks.set([dated[i], dated[i + 1]])
                new_conflicts.append(cf)
                break   # one deadline conflict per person is enough

    return new_conflicts


# ─────────────────────────────────────────────────────────────────────────────
# DEPARTMENTS
# ─────────────────────────────────────────────────────────────────────────────
def _get_org_for_request(request):
    """Helper to get the organization for the current request user, with fallback."""
    user = request.user
    try:
        org_profile = getattr(user, 'org_profile', None)
        if org_profile and org_profile.organization:
            return org_profile.organization
    except Exception:
        pass
    # Fallback: use first available organization and link user to it
    try:
        from organization.models import Organization, UserProfile as OrgUserProfile
        first_org = Organization.objects.first()
        if first_org and user.is_authenticated:
            op, _ = OrgUserProfile.objects.get_or_create(user=user)
            if not op.organization:
                op.organization = first_org
                op.save()
            return first_org
    except Exception:
        pass
    return None

@api_view(['GET', 'POST'])
def department_list_create(request):
    """
    GET  /api/resources/departments/  — list all departments
    POST /api/resources/departments/  — create a new department
    """
    if request.method == 'GET':
        org = _get_org_for_request(request)
        if org:
            depts = Department.all_objects.filter(organization=org)
        else:
            depts = Department.all_objects.all()
        return Response(DepartmentSerializer(depts, many=True).data)

    serializer = DepartmentSerializer(data=request.data)
    if serializer.is_valid():
        org = _get_org_for_request(request)
        serializer.save(organization=org)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
def department_detail(request, dept_id):
    try:
        dept = Department.all_objects.get(id=dept_id)
    except Department.DoesNotExist:
        return Response({"error": "Department not found."}, status=404)

    if request.method == 'GET':
        return Response(DepartmentSerializer(dept).data)
    if request.method == 'PUT':
        s = DepartmentSerializer(dept, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=400)
    dept.delete()
    return Response({"message": "Deleted."})


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEES
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
def employee_list_create(request):
    """
    GET  /api/resources/employees/?department=<id>&search=<q>
    POST /api/resources/employees/
         Body: { user_id, role, department_id, weekly_capacity, joined_date }
    """
    if request.method == 'GET':
        org = _get_org_for_request(request)
        if org:
            qs = EmployeeProfile.all_objects.filter(is_active=True, organization=org).select_related('user', 'department')
        else:
            qs = EmployeeProfile.all_objects.filter(is_active=True).select_related('user', 'department')

        # Filter by department
        dept_id = request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        # Text search across name / role / department
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)  |
                Q(user__username__icontains=search)   |
                Q(role__icontains=search)              |
                Q(department__name__icontains=search)
            )

        # Sort
        sort = request.query_params.get('sort', 'name')
        if sort == 'utilization':
            # Python-side sort (utilization is computed, not stored)
            employees = list(qs)
            def get_util(emp):
                hours = sum(t.effort_in_hours for t in emp.res_tasks.exclude(status='done'))
                return (hours / emp.weekly_capacity * 100) if emp.weekly_capacity > 0 else 0
            employees.sort(key=get_util, reverse=True)
            return Response(EmployeeWorkloadSerializer(employees, many=True).data)

        return Response(EmployeeWorkloadSerializer(qs, many=True).data)

    # POST — create employee profile (User must already exist)
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({"error": "user_id is required."}, status=400)
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

    if hasattr(user, 'res_employee'):
        return Response({"error": "EmployeeProfile already exists for this user."}, status=400)

    dept = None
    dept_id = request.data.get('department_id')
    if dept_id:
        try:
            dept = Department.all_objects.get(id=dept_id)
        except Department.DoesNotExist:
            pass

    org = _get_org_for_request(request)
    profile = EmployeeProfile.objects.create(
        user            = user,
        department      = dept,
        role            = request.data.get('role', 'DEV'),
        weekly_capacity = float(request.data.get('weekly_capacity', 40)),
        joined_date     = request.data.get('joined_date') or None,
        organization    = org,
    )
    return Response(EmployeeProfileSerializer(profile).data, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
def employee_detail(request, emp_id):
    try:
        emp = EmployeeProfile.all_objects.select_related('user', 'department').get(id=emp_id)
    except EmployeeProfile.DoesNotExist:
        return Response({"error": "Employee not found."}, status=404)

    if request.method == 'GET':
        return Response(EmployeeWorkloadSerializer(emp).data)

    if request.method == 'PUT':
        # Update editable fields
        if 'role' in request.data:
            emp.role = request.data['role']
        if 'weekly_capacity' in request.data:
            emp.weekly_capacity = float(request.data['weekly_capacity'])
        if 'is_active' in request.data:
            emp.is_active = request.data['is_active']
        if 'joined_date' in request.data:
            emp.joined_date = request.data['joined_date'] or None
        if 'department_id' in request.data:
            try:
                emp.department = Department.objects.get(id=request.data['department_id'])
            except Department.DoesNotExist:
                emp.department = None
        emp.save()
        detect_and_save_conflicts()
        return Response(EmployeeWorkloadSerializer(emp).data)

    # DELETE — soft delete
    emp.is_active = False
    emp.save()
    return Response({"message": f"{emp.full_name} deactivated."})


# ─────────────────────────────────────────────────────────────────────────────
# WORKLOAD DASHBOARD  (summary + per-employee cards)
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
def workload_dashboard(request):
    """
    GET /api/resources/workload/
    Returns summary stats + full employee workload cards with computed utilization.
    Optional query params: ?department=<id>  ?search=<q>  ?sort=utilization
    """
    qs = EmployeeProfile.objects.filter(is_active=True).select_related('user', 'department').prefetch_related('res_tasks')

    dept_id = request.query_params.get('department')
    if dept_id:
        qs = qs.filter(department_id=dept_id)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search)  |
            Q(department__name__icontains=search)
        )

    employees = list(qs)

    def utilization(emp):
        hours = sum(t.effort_in_hours for t in emp.res_tasks.exclude(status='done').all())
        return (hours / emp.weekly_capacity * 100) if emp.weekly_capacity > 0 else 0

    if request.query_params.get('sort') == 'utilization':
        employees.sort(key=utilization, reverse=True)

    data = EmployeeWorkloadSerializer(employees, many=True).data

    # Summary counts
    underutilized = sum(1 for d in data if d['workload_status'] == 'underutilized')
    optimal       = sum(1 for d in data if d['workload_status'] == 'optimal')
    overloaded    = sum(1 for d in data if d['workload_status'] == 'overloaded')

    # Department utilization breakdown
    dept_breakdown = {}
    for emp in employees:
        dname = emp.department.name if emp.department else "No Department"
        if dname not in dept_breakdown:
            dept_breakdown[dname] = {'total': 0, 'count': 0}
        dept_breakdown[dname]['total'] += utilization(emp)
        dept_breakdown[dname]['count'] += 1
    dept_utilization = [
        {"department": k, "avg_utilization": round(v['total'] / v['count'], 1)}
        for k, v in dept_breakdown.items()
    ]

    return Response({
        "summary": {
            "total_members":  len(employees),
            "underutilized":  underutilized,
            "optimal":        optimal,
            "overloaded":     overloaded,
            "conflicts":      ResourceConflict.objects.filter(resolution='open').count(),
            "avg_utilization": round(sum(utilization(e) for e in employees) / len(employees), 1) if employees else 0,
        },
        "department_utilization": dept_utilization,
        "employees": data,
    })


# ─────────────────────────────────────────────────────────────────────────────
# RESOURCE TASKS
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
def task_list_create(request):
    """
    GET  /api/resources/tasks/?assignee=<emp_id>&status=<>&priority=<>
    POST /api/resources/tasks/
         Body: { title, priority, status, estimated_effort, effort_unit,
                 is_urgent, due_date, assignee_ids:[], user_id }
    """
    if request.method == 'GET':
        qs = ResourceTask.objects.prefetch_related('assignees')

        assignee_id = request.query_params.get('assignee')
        if assignee_id:
            qs = qs.filter(assignees__id=assignee_id)

        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)

        pr = request.query_params.get('priority')
        if pr:
            qs = qs.filter(priority=pr)

        return Response(ResourceTaskSerializer(qs, many=True).data)

    # POST — create task
    user_id = request.data.get('user_id', 1)
    try:
        creator = User.objects.get(id=user_id)
    except User.DoesNotExist:
        creator = None

    task = ResourceTask.objects.create(
        title            = request.data.get('title', '').strip(),
        description      = request.data.get('description', ''),
        priority         = request.data.get('priority', 'P3'),
        status           = request.data.get('status', 'todo'),
        estimated_effort = float(request.data.get('estimated_effort', 0)),
        effort_unit      = request.data.get('effort_unit', 'hours'),
        is_urgent        = bool(request.data.get('is_urgent', False)),
        due_date         = request.data.get('due_date') or None,
        created_by       = creator,
    )

    # Assign employees
    assignee_ids = request.data.get('assignee_ids', [])
    if assignee_ids:
        employees = EmployeeProfile.objects.filter(id__in=assignee_ids)
        task.assignees.set(employees)

    # Re-detect conflicts after assignment
    detect_and_save_conflicts()

    return Response(ResourceTaskSerializer(task).data, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
def task_detail(request, task_id):
    try:
        task = ResourceTask.objects.prefetch_related('assignees').get(id=task_id)
    except ResourceTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)

    if request.method == 'GET':
        return Response(ResourceTaskSerializer(task).data)

    if request.method == 'DELETE':
        task.delete()
        detect_and_save_conflicts()
        return Response({"message": "Task deleted."})

    # PUT — update
    for field in ['title', 'description', 'priority', 'status',
                  'estimated_effort', 'effort_unit', 'is_urgent', 'due_date']:
        if field in request.data:
            val = request.data[field]
            if field == 'estimated_effort':
                val = float(val)
            elif field == 'is_urgent':
                val = bool(val)
            elif field == 'due_date' and val == '':
                val = None
            setattr(task, field, val)
    task.save()

    if 'assignee_ids' in request.data:
        employees = EmployeeProfile.objects.filter(id__in=request.data['assignee_ids'])
        task.assignees.set(employees)

    detect_and_save_conflicts()
    return Response(ResourceTaskSerializer(task).data)


@api_view(['PATCH'])
def reassign_task(request, task_id):
    """
    PATCH /api/resources/tasks/<id>/reassign/
    Body: { "assignee_id": <employee_profile_id> }
    Reassigns a task to a different employee and re-runs conflict detection.
    """
    try:
        task = ResourceTask.objects.prefetch_related('assignees').get(id=task_id)
    except ResourceTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)

    assignee_id = request.data.get('assignee_id')
    if not assignee_id:
        return Response({"error": "assignee_id is required."}, status=400)

    try:
        new_assignee = EmployeeProfile.objects.get(id=assignee_id)
    except EmployeeProfile.DoesNotExist:
        return Response({"error": "Employee not found."}, status=404)

    task.assignees.set([new_assignee])
    task.save()
    detect_and_save_conflicts()
    return Response(ResourceTaskSerializer(task).data)


@api_view(['PATCH'])
def adjust_deadline(request, task_id):
    """
    PATCH /api/resources/tasks/<id>/adjust_deadline/
    Body: { "due_date": "YYYY-MM-DD" }
    Updates the task due date and re-runs conflict detection.
    """
    try:
        task = ResourceTask.objects.get(id=task_id)
    except ResourceTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)

    due_date = request.data.get('due_date')
    if not due_date:
        return Response({"error": "due_date is required."}, status=400)

    task.due_date = due_date
    task.save()
    detect_and_save_conflicts()
    return Response(ResourceTaskSerializer(task).data)



# ─────────────────────────────────────────────────────────────────────────────
# CAPACITY CALENDAR
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
def capacity_calendar(request):
    """
    GET  /api/resources/capacity/?week_start=YYYY-MM-DD
         Returns all employee capacity plans for the given week.
         If no plan exists, auto-generates defaults (8h/day from weekly_capacity).
    POST /api/resources/capacity/
         Body: { employee_id, week_start, monday_hours, ..., friday_hours, notes }
    """
    if request.method == 'GET':
        week_start_str = request.query_params.get('week_start')
        if week_start_str:
            try:
                from datetime import datetime
                week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            # Default to current Monday
            today = date.today()
            week_start = today - timedelta(days=today.weekday())

        employees = EmployeeProfile.objects.filter(is_active=True).select_related('user')
        result = []

        for emp in employees:
            # Get or auto-generate a capacity plan
            plan, created = CapacityPlan.objects.get_or_create(
                employee=emp, week_start=week_start,
                defaults={
                    'monday_hours':    min(emp.weekly_capacity / 5, 8),
                    'tuesday_hours':   min(emp.weekly_capacity / 5, 8),
                    'wednesday_hours': min(emp.weekly_capacity / 5, 8),
                    'thursday_hours':  min(emp.weekly_capacity / 5, 8),
                    'friday_hours':    min(emp.weekly_capacity / 5, 8),
                }
            )

            # Get tasks with due dates in this week
            week_end = week_start + timedelta(days=4)
            week_tasks = list(emp.res_tasks.filter(
                due_date__gte=week_start, due_date__lte=week_end
            ).exclude(status='done'))

            # Distribute tasks per weekday bucket
            day_tasks = {0: [], 1: [], 2: [], 3: [], 4: []}   # 0=Mon … 4=Fri
            for t in week_tasks:
                if t.due_date:
                    wd = t.due_date.weekday()
                    if wd < 5:
                        day_tasks[wd].append({
                            "id": t.id, "title": t.title,
                            "priority": t.priority, "is_urgent": t.is_urgent,
                            "effort_hours": t.effort_in_hours,
                        })

            plan_data = CapacityPlanSerializer(plan).data
            plan_data['day_tasks'] = day_tasks
            result.append(plan_data)

        return Response({
            "week_start": str(week_start),
            "week_end":   str(week_start + timedelta(days=4)),
            "plans":      result,
        })

    # POST — save / update plan
    serializer = CapacityPlanSerializer(data=request.data)
    if serializer.is_valid():
        emp = serializer.validated_data['employee']
        ws  = serializer.validated_data['week_start']
        plan, _ = CapacityPlan.objects.update_or_create(
            employee=emp, week_start=ws,
            defaults={k: v for k, v in serializer.validated_data.items()
                      if k not in ['employee', 'week_start']}
        )
        return Response(CapacityPlanSerializer(plan).data, status=201)
    return Response(serializer.errors, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# TIME OFF
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
def time_off_list_create(request):
    if request.method == 'GET':
        emp_id = request.query_params.get('employee')
        qs = TimeOff.objects.all()
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        return Response(TimeOffSerializer(qs, many=True).data)

    s = TimeOffSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=201)
    return Response(s.errors, status=400)


@api_view(['PUT', 'DELETE'])
def time_off_detail(request, to_id):
    try:
        to = TimeOff.objects.get(id=to_id)
    except TimeOff.DoesNotExist:
        return Response({"error": "Not found."}, status=404)

    if request.method == 'PUT':
        s = TimeOffSerializer(to, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=400)

    to.delete()
    return Response({"message": "Deleted."})


# ─────────────────────────────────────────────────────────────────────────────
# CONFLICT DETECTION
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
def conflict_list(request):
    """
    GET /api/resources/conflicts/
    Re-runs conflict detection, then returns open conflicts.
    """
    detect_and_save_conflicts()
    conflicts = ResourceConflict.objects.filter(resolution='open').select_related('employee').prefetch_related('tasks')
    return Response({
        "count": conflicts.count(),
        "conflicts": ResourceConflictSerializer(conflicts, many=True).data,
    })


@api_view(['POST'])
def resolve_conflict(request, conflict_id):
    """
    POST /api/resources/conflicts/<id>/resolve/
    Body: { "resolution": "reassigned" | "adjusted" | "override" }
    """
    try:
        cf = ResourceConflict.objects.get(id=conflict_id)
    except ResourceConflict.DoesNotExist:
        return Response({"error": "Conflict not found."}, status=404)

    resolution = request.data.get('resolution')
    if resolution not in ['reassigned', 'adjusted', 'override']:
        return Response({"error": "Invalid resolution."}, status=400)

    cf.resolution  = resolution
    cf.resolved_at = timezone.now()
    cf.save()
    return Response(ResourceConflictSerializer(cf).data)


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
def analytics(request):
    """
    GET /api/resources/analytics/
    Returns team-wide utilization stats, department breakdown, top overloaded members.
    """
    employees = list(
        EmployeeProfile.objects.filter(is_active=True)
        .select_related('department')
        .prefetch_related('res_tasks')
    )

    utilizations = []
    dept_map     = {}

    for emp in employees:
        hours = sum(t.effort_in_hours for t in emp.res_tasks.exclude(status='done').all())
        util  = round((hours / emp.weekly_capacity * 100), 1) if emp.weekly_capacity > 0 else 0
        utilizations.append({"id": emp.id, "name": emp.full_name, "utilization": util,
                              "total_hours": round(hours, 1), "capacity": emp.weekly_capacity})
        dname = emp.department.name if emp.department else "No Department"
        if dname not in dept_map:
            dept_map[dname] = []
        dept_map[dname].append(util)

    avg = round(sum(u['utilization'] for u in utilizations) / len(utilizations), 1) if utilizations else 0
    dept_stats = [
        {"department": d, "avg_utilization": round(sum(v)/len(v), 1), "members": len(v)}
        for d, v in dept_map.items()
    ]

    # Top 5 busiest
    top_busy = sorted(utilizations, key=lambda x: x['utilization'], reverse=True)[:5]

    return Response({
        "team_avg_utilization":  avg,
        "total_active_employees": len(employees),
        "total_open_tasks":      ResourceTask.objects.exclude(status='done').count(),
        "total_open_conflicts":  ResourceConflict.objects.filter(resolution='open').count(),
        "department_stats":      dept_stats,
        "top_busiest_members":   top_busy,
        "all_utilizations":      sorted(utilizations, key=lambda x: x['utilization'], reverse=True),
    })


# ─────────────────────────────────────────────────────────────────────────────
# SUGGEST AVAILABLE EMPLOYEES for a task
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
def suggest_employees(request):
    """
    GET /api/resources/suggest/?effort_hours=<n>
    Returns employees with enough capacity to absorb the given effort.
    """
    try:
        needed = float(request.query_params.get('effort_hours', 8))
    except ValueError:
        needed = 8.0

    employees = EmployeeProfile.objects.filter(is_active=True).prefetch_related('res_tasks')
    suggestions = []

    for emp in employees:
        used = sum(t.effort_in_hours for t in emp.res_tasks.exclude(status='done').all())
        remaining = emp.weekly_capacity - used
        if remaining >= needed:
            suggestions.append({
                "id":           emp.id,
                "name":         emp.full_name,
                "initials":     emp.initials,
                "role":         emp.get_role_display(),
                "department":   emp.department.name if emp.department else "—",
                "remaining_capacity_hours": round(remaining, 1),
                "current_utilization":      round((used / emp.weekly_capacity * 100), 1) if emp.weekly_capacity else 0,
            })

    suggestions.sort(key=lambda x: x['remaining_capacity_hours'], reverse=True)
    return Response({"needed_hours": needed, "available_employees": suggestions})