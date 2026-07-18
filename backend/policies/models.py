from django.db import models
from django.utils import timezone
from core.tenant import TenantModel

class Policy(TenantModel):
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default="General")
    version = models.CharField(max_length=20, default="1.0")
    content = models.TextField()
    attachment = models.FileField(upload_to='policies/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title