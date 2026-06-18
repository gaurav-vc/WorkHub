from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'progress', 'department', 'created_at']
    list_filter = ['status', 'department']
    search_fields = ['name', 'department']
    list_editable = ['status', 'progress']