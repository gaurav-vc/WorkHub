from django.db import models
from django.contrib.auth.models import User
from core.tenant import TenantModel
from Project.models import Task

class MOM(TenantModel):
    title = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    site_name = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    
    meeting_status_choices = [
       ('scheduled', 'Scheduled'),
       ('in progress', 'In Progress'),
       ('Completed', 'Completed'),
       ('cancelled', 'Cancelled'),
       ('Draft', 'Draft'),
    ]
    meeting_type_choices = [
       ('monthly review' , 'Monthly Review'),
       ('weekly sync', 'Weekly Sync'),
       ('quaterly business review', 'Quaterly Business Review'),
       ('escalation', 'Escalation'),
    ]
    
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    meeting_type = models.CharField(max_length=100, choices=meeting_type_choices, blank=True, null=True)
    prepared_by = models.CharField(max_length=255, blank=True, null=True)
    meeting_status = models.CharField(
        max_length=50, 
        choices=meeting_status_choices, 
        default='scheduled'
    )
    
    description = models.TextField(blank=True, null=True)
    meeting_date = models.DateField()
    tags = models.JSONField(default=list, blank=True, help_text="Tags")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_moms')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_mom'
        ordering = ['-meeting_date']

    def __str__(self):
        return self.title

class MOMPoint(TenantModel):
    mom = models.ForeignKey(MOM, on_delete=models.CASCADE, related_name='points')
    text = models.CharField(max_length=500)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_mom_points')
    is_task_converted = models.BooleanField(default=False)
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_mom_points')
    status = models.CharField(max_length=20, choices=[('Open', 'Open'), ('In Progress', 'In Progress'), ('Completed', 'Completed')], default='Open')
    department = models.CharField(max_length=100, blank=True, null=True)
    priority = models.CharField(max_length=20, choices=[('High', 'High'), ('Medium', 'Medium'), ('Low', 'Low')], default='Medium')
    planned_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_mom_point'
        ordering = ['created_at']

    def __str__(self):
        return f"Point for {self.mom.title}"

class MOMAttendee(TenantModel):
    mom = models.ForeignKey(MOM, on_delete=models.CASCADE, related_name='attendees')
    is_external = models.BooleanField(default=False)
    # For internal
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    # For external
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'api_mom_attendee'

    def __str__(self):
        if self.user:
            return f"{self.user.username} for {self.mom.title}"
        return f"{self.name} for {self.mom.title}"

class MOMAgenda(TenantModel):
    mom = models.ForeignKey(MOM, on_delete=models.CASCADE, related_name='agendas')
    topic = models.CharField(max_length=500)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_mom_agenda'
        ordering = ['created_at']

    def __str__(self):
        return f"Agenda for {self.mom.title}: {self.topic[:50]}"
