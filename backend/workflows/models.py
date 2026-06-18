from django.db import models
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