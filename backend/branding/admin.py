from django.contrib import admin
from .models import BrandSetting

@admin.register(BrandSetting)
class BrandSettingAdmin(admin.ModelAdmin):
    list_display = ('companyName', 'primaryColor', 'accentColor', 'customDomain')