from django.db import models
from django.conf import settings
from core.tenant import TenantModel

class Workflow(TenantModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=False)
    # Store the entire drag-and-drop node structure seamlessly
    nodes = models.JSONField(default=list, blank=True)
    last_run = models.CharField(max_length=50, blank=True, null=True)
    runs = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class WorkflowLog(TenantModel):
    workflow = models.ForeignKey(Workflow, related_name='logs', on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default="Success")
    details = models.TextField(blank=True)
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.workflow.name} - {self.status} at {self.executed_at}"

# --- ENTERPRISE WORKFLOW MODELS ---

class WorkflowDefinition(TenantModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class WorkflowVersion(TenantModel):
    workflow_def = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField(default=1)
    definition_json = models.JSONField(default=dict, blank=True)
    n8n_workflow_id = models.CharField(max_length=255, blank=True, null=True)
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=50, default='DRAFT') # DRAFT, PUBLISHED, ARCHIVED
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.workflow_def.name} v{self.version_number}"

class WorkflowExecution(TenantModel):
    workflow_version = models.ForeignKey(WorkflowVersion, on_delete=models.CASCADE, related_name='executions')
    trigger_payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=50, default='RUNNING') # RUNNING, PAUSED, COMPLETED, FAILED, TIMEOUT
    current_node_id = models.CharField(max_length=255, blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Execution of {self.workflow_version} at {self.started_at}"

class ApprovalTask(TenantModel):
    execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='approval_tasks')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_approvals')
    role_id = models.CharField(max_length=100, blank=True, null=True) # E.g., 'HR_ADMIN'
    status = models.CharField(max_length=50, default='PENDING') # PENDING, APPROVED, REJECTED, ESCALATED
    sla_deadline = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Task for {self.assignee} ({self.status})"