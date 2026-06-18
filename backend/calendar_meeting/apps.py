# calendar_meeting/apps.py

from django.apps import AppConfig


class CalendarMeetingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'calendar_meeting'
    verbose_name = 'Calendar Meeting'