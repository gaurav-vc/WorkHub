from django.db import models
from core.tenant import TenantModel

class Notification(TenantModel):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    message = models.TextField()
    time = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'workspace_notification'

class TeamActivity(TenantModel):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='api_activities')
    action = models.CharField(max_length=200)
    target = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Team Activities'
        db_table = 'api_teamactivity'

    def __str__(self):
        return f"{self.user} {self.action} {self.target}"

class QuickLink(TenantModel):
    label = models.CharField(max_length=100)
    url = models.CharField(max_length=500)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='api_quick_links')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'label']
        db_table = 'api_quicklink'

    def __str__(self):
        return f"{self.label} ({self.user})"