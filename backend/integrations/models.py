from django.db import models
from core.tenant import TenantModel

# Notice: There are NO imports from .views here!

class Integration(TenantModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100)
    connected = models.BooleanField(default=False)
    icon = models.CharField(max_length=50, default="🔌")
    # Store API Keys and Webhooks securely in a JSON object
    config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name