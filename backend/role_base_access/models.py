from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

from core.tenant import TenantModel

class Role(TenantModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    department = models.CharField(max_length=255, blank=True, null=True)
    access_scope = models.CharField(max_length=50, default='Self')
    dashboard_type = models.CharField(max_length=50, default='Standard')
    can_manage_users = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    cross_department_access = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='Active')

    def __str__(self):
        return f"{self.name} ({self.code})"

class RoleAccessMapping(models.Model):
    # Using the exact "id" structure from your frontend (e.g., "1::pms_admin")
    id = models.CharField(max_length=255, primary_key=True)
    site_id = models.CharField(max_length=255)
    site_name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    
    # JSON fields for permissions and module states
    permissions = models.JSONField(default=dict)
    module_state = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

class FeatureAccessRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feature_requests')
    module_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='resolved_feature_requests')

    def __str__(self):
        return f"{self.user.username} - {self.module_name} ({self.status})"