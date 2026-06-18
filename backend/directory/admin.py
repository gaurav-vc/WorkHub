from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'department', 'status', 'location')
    list_filter = ('department', 'status', 'location')
    search_fields = ('name', 'email', 'role')