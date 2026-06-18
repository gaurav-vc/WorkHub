from rest_framework import serializers
from .models import TemplateCategory, Template, TemplateTask

class TemplateCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateCategory
        fields = ['id', 'title', 'slug', 'icon', 'color', 'description', 'ordering']


class TemplateTaskSerializer(serializers.ModelSerializer):
    dependencies = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = TemplateTask
        fields = [
            'id', 'title', 'description', 'priority', 'default_status', 
            'order', 'estimated_hours', 'due_days_after_project_creation',
            'assignee_role', 'checklist', 'dependencies', 'parent_task'
        ]


class TemplateListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.title', read_only=True)
    
    class Meta:
        model = Template
        fields = [
            'id', 'title', 'slug', 'description', 'category', 'category_name',
            'thumbnail', 'estimated_tasks', 'estimated_duration', 'tags',
            'is_public', 'is_featured', 'usage_count', 'created_at', 'columns',
            'milestones', 'default_members', 'workflow_settings'
        ]


class TemplateDetailSerializer(serializers.ModelSerializer):
    category = TemplateCategorySerializer(read_only=True)
    template_tasks = TemplateTaskSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Template
        fields = [
            'id', 'title', 'slug', 'description', 'category', 'thumbnail',
            'created_by_name', 'estimated_tasks', 'estimated_duration', 'tags',
            'is_public', 'is_featured', 'usage_count', 'created_at', 'updated_at',
            'template_tasks', 'columns', 'milestones', 'default_members', 'workflow_settings'
        ]


class ImportTemplateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField(required=True, help_text="ID of the existing Project to import into.")