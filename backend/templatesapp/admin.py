from django.contrib import admin
from .models import TemplateCategory, Template, TemplateTask

@admin.register(TemplateCategory)
class TemplateCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'ordering', 'is_active')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('ordering', 'is_active')

class TemplateTaskInline(admin.TabularInline):
    model = TemplateTask
    extra = 1
    fields = ('order', 'title', 'priority', 'default_status', 'due_days_after_project_creation', 'estimated_hours')
    ordering = ('order',)

@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_public', 'usage_count', 'created_at')
    list_filter = ('category', 'is_featured', 'is_public')
    search_fields = ('title', 'description')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [TemplateTaskInline]
    readonly_fields = ('usage_count',)