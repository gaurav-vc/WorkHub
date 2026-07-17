from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.tenant import TenantModel

class Project(TenantModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on-hold', 'On Hold'),
        ('completed', 'Completed'),
        ('pending', 'Pending'),
        ('planning', 'Planning'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    progress = models.IntegerField(default=0)
    department = models.CharField(max_length=100, blank=True, default="")
    template_type = models.CharField(max_length=100, default='blank', blank=True)
    
    # NEW: React specific fields
    due_date = models.DateField(null=True, blank=True)
    team_data = models.JSONField(default=list, blank=True) 
    tasks_data = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_created_projects', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        pass

    def __str__(self):
        return self.name

class ProjectMilestone(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=200)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        pass

    def __str__(self):
        return f'{self.project.name} - {self.title}'

class ActivityLog(TenantModel):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=200)
    details = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} {self.action} on {self.content_object}'

from django.core.exceptions import ValidationError
from django.utils import timezone

class Task(TenantModel):
    PRIORITY_CHOICES = [
        ('P1', 'P1 - Critical'),
        ('P2', 'P2 - High'),
        ('P3', 'P3 - Medium'),
        ('P4', 'P4 - Low'),
    ]
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('open', 'Open'),
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
        ('on_hold', 'On Hold'),
        ('delayed', 'Delayed'),
        ('done', 'Done'),
    ]

    title = models.CharField(max_length=300)
    project = models.ForeignKey('Project.Project', on_delete=models.CASCADE, related_name='api_tasks', null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_assigned_tasks', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_created_tasks', null=True, blank=True)
    priority = models.CharField(max_length=2, choices=PRIORITY_CHOICES, default='P3')
    status = models.CharField(max_length=100, default='pending')
    due_date = models.DateField()
    due_time = models.TimeField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    
    start_day = models.IntegerField(default=0)
    duration = models.IntegerField(default=3)
    actual_effort = models.IntegerField(default=0)
    color = models.CharField(max_length=50, default='bg-primary')
    dependency = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='dependent_tasks_legacy')

    parent_task = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subtasks')
    blocking_dependencies = models.ManyToManyField('self', symmetrical=False, related_name='blocked_tasks', blank=True, db_table='api_task_blocking_dependencies')

    class Meta:
        ordering = ['priority', 'due_date']
        db_table = 'api_task'

    def __str__(self):
        return f"[{self.priority}] {self.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        status_changed_to_done = False
        status_changed_to_delayed = False
        newly_assigned_user = None

        if not is_new:
            old_task = Task.objects.get(pk=self.pk)
            if old_task.status not in ['done', 'completed'] and self.status in ['done', 'completed']:
                status_changed_to_done = True
            if old_task.status != 'delayed' and self.status == 'delayed':
                status_changed_to_delayed = True
            if old_task.assigned_to != self.assigned_to and self.assigned_to:
                newly_assigned_user = self.assigned_to
        elif self.status in ['done', 'completed']:
            status_changed_to_done = True
            if self.assigned_to:
                newly_assigned_user = self.assigned_to
        elif self.status == 'delayed':
            status_changed_to_delayed = True
            if self.assigned_to:
                newly_assigned_user = self.assigned_to
        else:
            if self.assigned_to:
                newly_assigned_user = self.assigned_to

        if self.status in ['done', 'completed'] and self.pk:
            incomplete_deps = self.blocking_dependencies.exclude(status__in=['done', 'completed'])
            if incomplete_deps.exists():
                raise ValidationError("Cannot complete this task because it has incomplete blocking dependencies.")

        super().save(*args, **kwargs)

        if newly_assigned_user:
            try:
                from workspace.models import Notification
                Notification.objects.create(
                    type="task_assigned",
                    title="Task Assigned",
                    message=f"@{newly_assigned_user.username} has been assigned to task '{self.title}'",
                    link="/projects"
                )
            except Exception as e:
                print(f"Error creating notification: {e}")

        if status_changed_to_done:
            if not self.completion_date:
                self.completion_date = timezone.now()
            target_user = self.assigned_to or self.created_by
            if target_user and hasattr(target_user, 'auth_profile'):
                profile = target_user.auth_profile
                profile.points += 50
                new_level = (profile.points // 100) + 1
                if new_level > profile.level:
                    profile.level = new_level
                profile.save()

        if status_changed_to_delayed:
            self._trigger_ai_delayed_workflow()
            
    def _trigger_ai_delayed_workflow(self):
        ai_username = "AI Co-Pilot"
        ai_user, _ = User.objects.get_or_create(
            username=ai_username,
            defaults={'first_name': 'AI', 'last_name': 'Co-Pilot', 'email': 'ai@company.local'}
        )
        
        assignee_name = self.assigned_to.get_full_name() or self.assigned_to.username if self.assigned_to else "Team"
        
        try:
            from chat.models import Channel, Message
            channel, _ = Channel.objects.get_or_create(name='General', defaults={'description': 'Company wide chat'})
            Message.objects.create(
                channel=channel,
                user=ai_user,
                content=f"Hey @{assignee_name}, I noticed the task '{self.title}' was just marked as delayed. Do you need any extra resources or help from the team to clear blockers?"
            )
        except ImportError:
            pass

        if self.assigned_to and self.assigned_to.email:
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject=f"Action Required: Overdue Task ({self.title})",
                    message=f"Hello {assignee_name},\n\nYour task '{self.title}' has been flagged as delayed.\n\nPlease update the project timeline or request help in the Team Chat.\n\n- AI Co-Pilot",
                    from_email='ai@company.local',
                    recipient_list=[self.assigned_to.email],
                    fail_silently=True,
                )
            except Exception as e:
                pass


class TaskComment(TenantModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_task_comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_taskcomment'

    def __str__(self):
        return f'Comment by {self.user} on {self.task}'

class TaskAttachment(TenantModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='task_attachments/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_task_attachments', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_taskattachment'

    def __str__(self):
        return self.file.name

class TaskChecklist(TenantModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklists')
    title = models.CharField(max_length=200)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_taskchecklist'

    def __str__(self):
        return self.title

class TaskChat(TenantModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='chats')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_task_chats')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_taskchat'

    def __str__(self):
        return f'Chat by {self.user} on {self.task}'
