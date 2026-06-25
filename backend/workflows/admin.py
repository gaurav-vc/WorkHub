from django.contrib import admin
from .models import Workflow, WorkflowDefinition, WorkflowVersion, WorkflowExecution, ApprovalTask

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    # Shows these columns in the admin table
    list_display = ('name', 'active', 'runs', 'created_at')
    # Adds a filter sidebar to easily find active vs inactive workflows
    list_filter = ('active',)
    search_fields = ('name', 'description')

@admin.register(WorkflowDefinition)
class WorkflowDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'trigger_type', 'created_at')
    list_filter = ('is_active', 'trigger_type')
    search_fields = ('name',)

@admin.register(WorkflowVersion)
class WorkflowVersionAdmin(admin.ModelAdmin):
    list_display = ('workflow_def', 'version_number', 'status', 'published_at')
    list_filter = ('status',)

@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = ('workflow_version', 'status', 'started_at', 'completed_at')
    list_filter = ('status',)

@admin.register(ApprovalTask)
class ApprovalTaskAdmin(admin.ModelAdmin):
    list_display = ('execution', 'assignee', 'status', 'sla_deadline')
    list_filter = ('status',)