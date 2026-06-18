from django.db import models
from core.tenant import TenantModel

class Employee(TenantModel):
    STATUS_CHOICES = [
        ('active', 'Active'), ('away', 'Away'), 
        ('busy', 'Busy'), ('offline', 'Offline')
    ]

    name = models.CharField(max_length=100)
    initials = models.CharField(max_length=3)
    role = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    location = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    joined_date = models.CharField(max_length=20) # e.g., "Mar 2022"
    manager = models.CharField(max_length=100, blank=True, null=True)
    
    # Store the array of skills (e.g., ["React", "Python"])
    skills = models.JSONField(default=list, blank=True)

    # Employee profile photo (uploaded by admin/manager)
    photo = models.ImageField(upload_to='employee_photos/', blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    website = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name