from django.contrib import admin
from .models import RiskIndicator

@admin.register(RiskIndicator)
class RiskIndicatorAdmin(admin.ModelAdmin):
    # This creates neat columns in your admin panel
    list_display = ('title', 'severity', 'department')
    # This adds a filter box on the right side of the screen!
    list_filter = ('severity', 'department')
    search_fields = ('title', 'description')