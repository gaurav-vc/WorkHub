from django.contrib import admin
from .models import Role, AuditLog

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'usersCount', 'description')
    search_fields = ('name',)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'target', 'time')
    list_filter = ('action',)
    search_fields = ('user', 'target')