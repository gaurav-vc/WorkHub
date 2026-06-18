from django.db import models
from django.contrib.auth.models import User
from core.tenant import TenantModel

class HRRequest(TenantModel):
    REQUEST_TYPES = [('Leave', 'Leave'), ('Travel', 'Travel'), ('Expense', 'Expense')]
    STATUS_CHOICES = [('pending', 'pending'), ('approved', 'approved'), ('rejected', 'rejected')]

    # The user making the request (Made nullable to prevent SQLite constraint errors!)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hr_requests', null=True, blank=True)
    
    title = models.CharField(max_length=200) # e.g., "Annual Leave", "Client Meeting"
    type = models.CharField(max_length=50, choices=REQUEST_TYPES)
    detail = models.TextField(blank=True) # E.g., "Going to New York for Acme Corp"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # This JSON field will store the specific form inputs (budget, start/end dates, receipts)
    form_data = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.type} - {self.title}"


class HRRequestLog(TenantModel):
    hr_request = models.ForeignKey(HRRequest, on_delete=models.CASCADE, related_name='logs')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50) # 'created', 'approved', 'rejected', 'status_changed'
    note = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        actor_name = self.actor.get_full_name() or self.actor.username if self.actor else "System"
        return f"{actor_name} {self.action} on {self.timestamp}"


class Approval(TenantModel):
    TYPE_CHOICES = [
        ('Leave', 'Leave Request'),
        ('Budget', 'Budget Request'),
        ('Access', 'Access Request'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]

    approval_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_approval_requests')
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_approvals_to_review')
    detail = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'api_approval'

    def __str__(self):
        return f"{self.get_approval_type_display()} from {self.requester} → {self.status}"