# backend/timeline/models.py
from django.db import models
from core.tenant import TenantModel
from django.contrib.auth.models import User

class Employee(TenantModel):
    name = models.CharField(max_length=100)
    initials = models.CharField(max_length=10)
    role = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.role})"


