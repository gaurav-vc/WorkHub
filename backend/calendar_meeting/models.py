from django.db import models
from django.contrib.auth.models import User
from core.tenant import TenantModel

class Meeting(TenantModel):
    TYPE_CHOICES = [
        ('internal', 'Internal Review'),
        ('client', 'Client Sync'),
        ('standup', 'Daily Standup'),
        ('workshop', 'Workshop/Training'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True) 
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_organized_meetings')
    attendees = models.ManyToManyField(User, related_name='api_meetings_attending', blank=True, db_table='api_meeting_attendees')
    external_attendees = models.TextField(blank=True, null=True, help_text="Comma-separated emails")
    meeting_time = models.DateTimeField() 
    end_time = models.DateTimeField(blank=True, null=True) 
    duration = models.CharField(max_length=50, default="30 mins")
    meeting_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='internal')
    meeting_link = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ['meeting_time']
        db_table = 'api_meeting'

    def __str__(self):
        return f"{self.title} ({self.meeting_time.strftime('%Y-%m-%d')})"
