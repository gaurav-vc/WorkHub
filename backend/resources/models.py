# resources/models.py
# ─────────────────────────────────────────────────────────────────────────────
# Completely isolated app — no changes to the existing 'api' app.
# All related_names are prefixed with 'res_' to avoid clashes.
# ─────────────────────────────────────────────────────────────────────────────
from django.db import models
from django.contrib.auth.models import User
from core.tenant import TenantModel


# ── 1. Department ─────────────────────────────────────────────────────────────
class Department(TenantModel):
    """
    A group/team within the company (e.g. Engineering, Design, QA).
    Employees belong to one department.
    """
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


# ── 2. EmployeeProfile ────────────────────────────────────────────────────────
class EmployeeProfile(TenantModel):
    """
    Extends Django's built-in User with resource-planning specific fields.
    One employee = one User + one EmployeeProfile.
    Weekly capacity is stored in hours (e.g. 40 for a full-time employee).
    """
    ROLE_CHOICES = [
        ('PM',      'Product Manager'),
        ('DEV',     'Developer'),
        ('DESIGN',  'Designer'),
        ('QA',      'QA Engineer'),
        ('DEVOPS',  'DevOps Engineer'),
        ('ANALYST', 'Business Analyst'),
        ('HR',      'HR Specialist'),
    ]

    user             = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='res_employee'
    )
    department       = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='res_employees'
    )
    role             = models.CharField(max_length=20, choices=ROLE_CHOICES, default='DEV')
    # How many hours per week this employee is available (default = 40h)
    weekly_capacity  = models.FloatField(default=40.0)
    # Stores computed initials for avatar display ("JD" for Jane Doe)
    initials         = models.CharField(max_length=3, blank=True)
    is_active        = models.BooleanField(default=True)
    joined_date      = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['user__first_name', 'user__last_name']

    def save(self, *args, **kwargs):
        # Auto-compute initials whenever the profile is saved
        if not self.initials:
            name  = self.user.get_full_name()
            parts = name.split() if name else [self.user.username]
            self.initials = ''.join(p[0] for p in parts[:2]).upper()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"


# ── 3. ResourceTask ───────────────────────────────────────────────────────────
class ResourceTask(TenantModel):
    """
    A task tracked specifically for resource planning purposes.
    Separate from the api.Task model so this module stays isolated.
    An employee can have many ResourceTasks; a task can have many assignees.
    """
    PRIORITY_CHOICES = [
        ('P1', 'Critical'),
        ('P2', 'High'),
        ('P3', 'Medium'),
        ('P4', 'Low'),
    ]
    STATUS_CHOICES = [
        ('todo',        'To Do'),
        ('in_progress', 'In Progress'),
        ('done',        'Done'),
        ('blocked',     'Blocked'),
    ]
    EFFORT_UNIT_CHOICES = [
        ('hours', 'Hours'),
        ('days',  'Days'),
    ]

    title            = models.CharField(max_length=300)
    description      = models.TextField(blank=True, default="")
    assignees        = models.ManyToManyField(
        EmployeeProfile, related_name='res_tasks', blank=True
    )
    priority         = models.CharField(max_length=2, choices=PRIORITY_CHOICES, default='P3')
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    # Effort is how many hours (or days) this task requires
    estimated_effort = models.FloatField(default=0.0)
    effort_unit      = models.CharField(
        max_length=10, choices=EFFORT_UNIT_CHOICES, default='hours'
    )
    is_urgent        = models.BooleanField(default=False)
    due_date         = models.DateField(null=True, blank=True)
    created_by       = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='res_created_tasks'
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['priority', 'due_date']

    @property
    def effort_in_hours(self):
        """Always return effort in hours regardless of unit."""
        return self.estimated_effort * 8 if self.effort_unit == 'days' else self.estimated_effort

    def __str__(self):
        return f"[{self.priority}] {self.title}"


# ── 4. CapacityPlan ───────────────────────────────────────────────────────────
class CapacityPlan(TenantModel):
    """
    Tracks per-day capacity for an employee in a specific week.
    Useful for the Capacity Calendar view — stores how many hours
    an employee has available on each weekday.
    """
    employee      = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE, related_name='res_capacity_plans'
    )
    week_start    = models.DateField()   # Always a Monday
    # Daily available hours (0 if on leave / holiday)
    monday_hours    = models.FloatField(default=8.0)
    tuesday_hours   = models.FloatField(default=8.0)
    wednesday_hours = models.FloatField(default=8.0)
    thursday_hours  = models.FloatField(default=8.0)
    friday_hours    = models.FloatField(default=8.0)
    notes           = models.TextField(blank=True, default="")

    class Meta:
        # One plan per employee per week
        unique_together = ['employee', 'week_start']
        ordering        = ['-week_start']

    @property
    def total_weekly_hours(self):
        return (
            self.monday_hours + self.tuesday_hours + self.wednesday_hours
            + self.thursday_hours + self.friday_hours
        )

    def __str__(self):
        return f"{self.employee.full_name} — week of {self.week_start}"


# ── 5. TimeOff ────────────────────────────────────────────────────────────────
class TimeOff(TenantModel):
    """
    Records planned leaves / holidays for an employee.
    Used to reduce capacity on affected days.
    """
    TYPE_CHOICES = [
        ('leave',   'Annual Leave'),
        ('sick',    'Sick Leave'),
        ('holiday', 'Public Holiday'),
        ('other',   'Other'),
    ]
    employee   = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE, related_name='res_time_offs'
    )
    start_date = models.DateField()
    end_date   = models.DateField()
    leave_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='leave')
    approved   = models.BooleanField(default=False)
    notes      = models.TextField(blank=True, default="")

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.employee.full_name} — {self.get_leave_type_display()} ({self.start_date} → {self.end_date})"


# ── 6. ResourceConflict ───────────────────────────────────────────────────────
class ResourceConflict(TenantModel):
    """
    Stores detected conflicts (overload, overlapping urgencies, etc.).
    Auto-created by the conflict-detection logic; can be resolved manually.
    """
    TYPE_CHOICES = [
        ('overloaded', 'Overloaded Resource'),
        ('urgent',     'Multiple Urgent Tasks'),
        ('deadline',   'Overlapping Deadlines'),
    ]
    RESOLUTION_CHOICES = [
        ('open',       'Open'),
        ('reassigned', 'Reassigned Task'),
        ('adjusted',   'Deadline Adjusted'),
        ('override',   'Overridden'),
    ]

    employee    = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE, related_name='res_conflicts'
    )
    conflict_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message       = models.TextField()
    tasks         = models.ManyToManyField(ResourceTask, related_name='res_conflicts', blank=True)
    resolution    = models.CharField(
        max_length=20, choices=RESOLUTION_CHOICES, default='open'
    )
    detected_at   = models.DateTimeField(auto_now_add=True)
    resolved_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"[{self.get_conflict_type_display()}] {self.employee.full_name} — {self.resolution}"