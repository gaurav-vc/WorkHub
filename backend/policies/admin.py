from django.contrib import admin
from .models import Policy

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'version', 'updated_at')
    list_filter = ('category',)
    search_fields = ('title', 'content')