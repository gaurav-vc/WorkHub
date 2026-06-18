from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from core.tenant import TenantModel

class TemplateCategory(TenantModel):
    title = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name (e.g., 'Users', 'Briefcase')")
    color = models.CharField(max_length=20, blank=True, help_text="Hex color or CSS class")
    description = models.TextField(blank=True)
    ordering = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Template Categories"
        ordering = ['ordering', 'title']

    def __str__(self):
        return self.title


class Template(TenantModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True)
    description = models.TextField()
    category = models.ForeignKey(TemplateCategory, on_delete=models.SET_NULL, null=True, related_name='templates')
    thumbnail = models.ImageField(upload_to='templates/thumbnails/', blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_templates')
    
    # Metadata for frontend display without counting relation constantly
    estimated_tasks = models.IntegerField(default=0, help_text="Auto-updated or manual estimate")
    estimated_duration = models.CharField(max_length=100, blank=True, help_text="e.g., '2 Weeks'")
    tags = models.JSONField(default=list, blank=True)
    columns = models.JSONField(default=list, blank=True, help_text="Custom columns/sections for this template")
    
    # NEW: Phase 1 Enhancements
    milestones = models.JSONField(default=list, blank=True, help_text="List of milestones to create when cloning")
    default_members = models.JSONField(default=list, blank=True, help_text="Roles or specific users to add to the project")
    workflow_settings = models.JSONField(default=dict, blank=True, help_text="Workflow automation triggers and actions")
    
    is_public = models.BooleanField(default=True, help_text="Available in the marketplace")
    is_featured = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', '-usage_count', '-created_at']

    def __str__(self):
        return self.title


class TemplateTask(TenantModel):
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='template_tasks')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=20, default='P3') # Must align with existing PRIORITY_CHOICES
    default_status = models.CharField(max_length=50, default='pending') # Must align with existing STATUS_CHOICES
    order = models.IntegerField(default=0)
    
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.0)
    labels = models.JSONField(default=list, blank=True)
    
    # Due date calculation strategy during import
    due_days_after_project_creation = models.IntegerField(
        default=0, 
        validators=[MinValueValidator(0)],
        help_text="Number of days after project creation this task should be due."
    )
    assignee_role = models.CharField(max_length=50, blank=True, help_text="Role to map to real user during import")
    checklist = models.JSONField(default=list, blank=True)
    
    # Self-referencing dependencies and subtasks (safely isolated to templates before import)
    dependencies = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='dependent_template_tasks')
    parent_task = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.template.title} - {self.title}"