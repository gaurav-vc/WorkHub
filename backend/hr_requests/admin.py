from django.contrib import admin
from .models import HRRequest

@admin.register(HRRequest)
class HRRequestAdmin(admin.ModelAdmin):
    # This makes the admin table show these specific columns
    list_display = ('title', 'type', 'status', 'user', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('title', 'detail')