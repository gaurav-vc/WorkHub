# resources/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Department, EmployeeProfile, ResourceTask, CapacityPlan, TimeOff, ResourceConflict


# ── Department ────────────────────────────────────────────────────────────────
class DepartmentSerializer(serializers.ModelSerializer):
    # --- SAFE FRONTEND ALIAS FIELDS ---
    # These resolve dynamically using the methods below to prevent database crashes
    employee_count = serializers.SerializerMethodField()
    total_employees = serializers.SerializerMethodField()
    total_staff = serializers.SerializerMethodField()
    employees = serializers.SerializerMethodField()
    
    # Direct field aliases for strings
    title = serializers.CharField(source='name', read_only=True)
    department_name = serializers.CharField(source='name', read_only=True)

    class Meta:
        model = Department
        fields = [
            'id', 
            'name', 'title', 'department_name',
            'description', 
            'employee_count', 'total_employees', 'total_staff', 'employees',
            'created_at'
        ]

    # Dynamically calculates the count from your related EmployeeProfile table safely
    def get_employee_count(self, obj):
        # Checks if your model has a reverse relation set up
        if hasattr(obj, 'employeeprofile_set'):
            return obj.employeeprofile_set.count()
        elif hasattr(obj, 'employees'):
            return obj.employees.count()
        return 0

    # Links all fallback aliases to the same functional counter
    def get_total_employees(self, obj):
        return self.get_employee_count(obj)

    def get_total_staff(self, obj):
        return self.get_employee_count(obj)

    def get_employees(self, obj):
        return self.get_employee_count(obj)


# ── EmployeeProfile (lightweight — used inside task lists) ────────────────────
class EmployeeMinimalSerializer(serializers.ModelSerializer):
    name       = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    class Meta:
        model  = EmployeeProfile
        fields = ['id', 'name', 'initials', 'role', 'department', 'weekly_capacity']

    def get_name(self, obj):
        return obj.full_name

    def get_department(self, obj):
        return obj.department.name if obj.department else None


# ── ResourceTask (lightweight — used inside employee cards) ───────────────────
class ResourceTaskMinimalSerializer(serializers.ModelSerializer):
    effort_hours = serializers.SerializerMethodField()

    class Meta:
        model  = ResourceTask
        fields = ['id', 'title', 'priority', 'status', 'is_urgent', 'due_date', 'effort_hours']

    def get_effort_hours(self, obj):
        return obj.effort_in_hours


# ── ResourceTask (full — for CRUD) ────────────────────────────────────────────
class ResourceTaskSerializer(serializers.ModelSerializer):
    assignees    = EmployeeMinimalSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=EmployeeProfile.objects.all(),
        write_only=True, source='assignees', required=False
    )
    effort_hours = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = ResourceTask
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'estimated_effort', 'effort_unit', 'effort_hours', 'is_urgent',
            'due_date', 'assignees', 'assignee_ids',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_effort_hours(self, obj):
        return obj.effort_in_hours

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


# ── EmployeeProfile (full — for workload dashboard) ───────────────────────────
class EmployeeWorkloadSerializer(serializers.ModelSerializer):
    name            = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    assigned_tasks  = serializers.SerializerMethodField()
    total_hours     = serializers.SerializerMethodField()
    utilization     = serializers.SerializerMethodField()
    workload_status = serializers.SerializerMethodField()

    class Meta:
        model  = EmployeeProfile
        fields = [
            'id', 'name', 'initials', 'role', 'department', 'department_name',
            'weekly_capacity', 'is_active',
            'assigned_tasks', 'total_hours', 'utilization', 'workload_status',
        ]

    def get_name(self, obj):
        return obj.full_name

    def get_department_name(self, obj):
        return obj.department.name if obj.department else "—"

    def _active_tasks(self, obj):
        if not hasattr(obj, '_cached_tasks'):
            obj._cached_tasks = list(
                obj.res_tasks.exclude(status='done').select_related()
            )
        return obj._cached_tasks

    def get_assigned_tasks(self, obj):
        return ResourceTaskMinimalSerializer(self._active_tasks(obj), many=True).data

    def get_total_hours(self, obj):
        return round(sum(t.effort_in_hours for t in self._active_tasks(obj)), 1)

    def get_utilization(self, obj):
        if obj.weekly_capacity <= 0:
            return 0
        total = sum(t.effort_in_hours for t in self._active_tasks(obj))
        return min(round((total / obj.weekly_capacity) * 100), 150)

    def get_workload_status(self, obj):
        u = self.get_utilization(obj)
        if u < 50:
            return "underutilized"
        elif u <= 85:
            return "optimal"
        return "overloaded"


# ── EmployeeProfile (CRUD) ────────────────────────────────────────────────────
class EmployeeProfileSerializer(serializers.ModelSerializer):
    name       = serializers.SerializerMethodField()
    email      = serializers.SerializerMethodField()
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), write_only=True,
        source='department', required=False, allow_null=True
    )

    class Meta:
        model  = EmployeeProfile
        fields = [
            'id', 'name', 'email', 'initials', 'role',
            'department', 'department_id',
            'weekly_capacity', 'is_active', 'joined_date',
        ]

    def get_name(self, obj):
        return obj.full_name

    def get_email(self, obj):
        return obj.user.email


# ── CapacityPlan ──────────────────────────────────────────────────────────────
class CapacityPlanSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    total_hours   = serializers.SerializerMethodField()

    class Meta:
        model  = CapacityPlan
        fields = [
            'id', 'employee', 'employee_name', 'week_start',
            'monday_hours', 'tuesday_hours', 'wednesday_hours',
            'thursday_hours', 'friday_hours',
            'total_hours', 'notes',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_total_hours(self, obj):
        return obj.total_weekly_hours


# ── TimeOff ───────────────────────────────────────────────────────────────────
class TimeOffSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model  = TimeOff
        fields = ['id', 'employee', 'employee_name', 'start_date', 'end_date',
                  'leave_type', 'approved', 'notes']

    def get_employee_name(self, obj):
        return obj.employee.full_name


# ── ResourceConflict ──────────────────────────────────────────────────────────
class ResourceConflictSerializer(serializers.ModelSerializer):
    employee_name     = serializers.SerializerMethodField()
    employee_initials = serializers.SerializerMethodField()
    task_titles       = serializers.SerializerMethodField()

    class Meta:
        model  = ResourceConflict
        fields = [
            'id', 'employee', 'employee_name', 'employee_initials',
            'conflict_type', 'message', 'task_titles',
            'resolution', 'detected_at', 'resolved_at',
        ]

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_employee_initials(self, obj):
        return obj.employee.initials

    def get_task_titles(self, obj):
        return list(obj.tasks.values_list('title', flat=True))