# resources/admin.py
from django.contrib import admin
from .models import Department, EmployeeProfile, ResourceTask, CapacityPlan, TimeOff, ResourceConflict


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'description']
    search_fields = ['name']


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'role', 'department', 'weekly_capacity', 'is_active', 'initials']
    list_filter   = ['role', 'department', 'is_active']
    search_fields = ['user__first_name', 'user__last_name', 'user__username']
    list_editable = ['weekly_capacity', 'is_active']
    autocomplete_fields = ['user']

    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Role & Department", {"fields": ("role", "department")}),
        ("Capacity", {"fields": ("weekly_capacity", "joined_date", "is_active")}),
        ("Display", {"fields": ("initials",), "description": "Leave blank to auto-generate from name"}),
    )


@admin.register(ResourceTask)
class ResourceTaskAdmin(admin.ModelAdmin):
    list_display   = ['title', 'priority', 'status', 'is_urgent', 'estimated_effort', 'effort_unit', 'due_date']
    list_filter    = ['priority', 'status', 'is_urgent', 'effort_unit']
    search_fields  = ['title']
    list_editable  = ['priority', 'status', 'is_urgent']
    filter_horizontal = ['assignees']
    date_hierarchy = 'due_date'

    fieldsets = (
        ("Task Info", {"fields": ("title", "description", "priority", "status", "is_urgent")}),
        ("Effort",    {"fields": ("estimated_effort", "effort_unit", "due_date")}),
        ("People",    {"fields": ("assignees", "created_by")}),
    )


@admin.register(CapacityPlan)
class CapacityPlanAdmin(admin.ModelAdmin):
    list_display  = ['employee', 'week_start', 'monday_hours', 'tuesday_hours',
                     'wednesday_hours', 'thursday_hours', 'friday_hours']
    list_filter   = ['week_start']
    search_fields = ['employee__user__first_name', 'employee__user__last_name']
    list_editable = ['monday_hours', 'tuesday_hours', 'wednesday_hours',
                     'thursday_hours', 'friday_hours']


@admin.register(TimeOff)
class TimeOffAdmin(admin.ModelAdmin):
    list_display  = ['employee', 'leave_type', 'start_date', 'end_date', 'approved']
    list_filter   = ['leave_type', 'approved']
    search_fields = ['employee__user__username']
    list_editable = ['approved']
    date_hierarchy = 'start_date'


@admin.register(ResourceConflict)
class ResourceConflictAdmin(admin.ModelAdmin):
    list_display  = ['employee', 'conflict_type', 'resolution', 'detected_at']
    list_filter   = ['conflict_type', 'resolution']
    search_fields = ['employee__user__username', 'message']
    readonly_fields = ['detected_at', 'message']
    list_editable  = ['resolution']


