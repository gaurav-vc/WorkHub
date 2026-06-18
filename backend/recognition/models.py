from django.db import models
from core.tenant import TenantModel

class Kudos(TenantModel):
    # Using CharFields instead of strict ForeignKeys to guarantee no SQLite crashes
    from_name = models.CharField(max_length=100)
    from_initials = models.CharField(max_length=3)
    to_name = models.CharField(max_length=100)
    to_initials = models.CharField(max_length=3)
    
    message = models.TextField()
    category = models.CharField(max_length=50) # e.g., "Innovation", "Team Player"
    reactions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Kudos from {self.from_name} to {self.to_name}"

class Birthday(TenantModel):
    name = models.CharField(max_length=100)
    initials = models.CharField(max_length=3)
    department = models.CharField(max_length=100)
    date_string = models.CharField(max_length=20) # e.g., "Mar 2"
    day_number = models.IntegerField() # e.g., 2 (used for sorting)

    def __str__(self):
        return f"{self.name} - {self.date_string}"