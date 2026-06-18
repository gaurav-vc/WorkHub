from django.db import models
from core.tenant import TenantModel

class RiskIndicator(TenantModel):
    title = models.CharField(max_length=200)
    severity = models.CharField(max_length=50) # 'high', 'medium', or 'low'
    description = models.TextField()
    department = models.CharField(max_length=100)

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"