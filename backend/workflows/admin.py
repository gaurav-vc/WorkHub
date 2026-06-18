from django.contrib import admin
from .models import Workflow

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    # Shows these columns in the admin table
    list_display = ('name', 'active', 'runs', 'created_at')
    # Adds a filter sidebar to easily find active vs inactive workflows
    list_filter = ('active',)
    search_fields = ('name', 'description')