from django.contrib import admin
from .models import Kudos, Birthday

@admin.register(Kudos)
class KudosAdmin(admin.ModelAdmin):
    list_display = ('from_name', 'to_name', 'category', 'reactions', 'created_at')
    list_filter = ('category',)
    search_fields = ('from_name', 'to_name', 'message')

@admin.register(Birthday)
class BirthdayAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'date_string')
    list_filter = ('department',)
    search_fields = ('name',)