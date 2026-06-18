from django.contrib import admin
from .models import Integration

@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    # Clean columns for your API connections
    list_display = ('name', 'category', 'connected')
    # Filter by category (HR, CRM, etc.) and whether they are currently connected
    list_filter = ('category', 'connected')
    search_fields = ('name', 'description')