from django.contrib import admin
from .models import RoleAccessMapping

@admin.register(RoleAccessMapping)
class RoleAccessMappingAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'site_name', 'role', 'updated_at')
    list_filter = ('site_name', 'role')
    search_fields = ('title', 'id')
    readonly_fields = ('created_at', 'updated_at')