from django.contrib import admin

# Register your models here.
from .models import Organization, UserProfile

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'org_id', 'status', 'created_at', 'company_name', 'country')
    search_fields = ('name', 'org_id', 'company_name', 'country', 'city')
    list_filter = ('status', 'white_label', 'country')
    readonly_fields = ('org_id', 'created_at', 'updated_at')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'phone_number')
    search_fields = ('user__username', 'user__email', 'phone_number', 'organization__name')
    list_filter = ('role', 'organization')
