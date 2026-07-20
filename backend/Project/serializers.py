from rest_framework import serializers
from .models import Project, ActivityLog, ProjectMilestone, Task, TaskComment, TaskAttachment, TaskChat

class TaskCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    class Meta:
        model = TaskComment
        fields = '__all__'

class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    class Meta:
        model = TaskAttachment
        fields = '__all__'

class TaskChatSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskChat
        fields = ['id', 'text', 'created_at', 'user_name']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "Unknown"

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    project_id = serializers.IntegerField(source='project.id', read_only=True)
    dueTime = serializers.SerializerMethodField()
    
    comments = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    subtasks = serializers.SerializerMethodField()
    blocked_by = serializers.SerializerMethodField()
    checklists = serializers.SerializerMethodField()
    chats = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    assignee_detail = serializers.SerializerMethodField()
    health_status = serializers.ReadOnlyField()

    class Meta:
        model = Task
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        if getattr(obj, 'project', None) and getattr(obj.project, 'created_by', None):
            return obj.project.created_by.get_full_name() or obj.project.created_by.username
        return "System"

    def get_assignee_detail(self, obj):
        if obj.assigned_to:
            name = obj.assigned_to.get_full_name() or obj.assigned_to.username
            return {"id": obj.assigned_to.id, "name": name, "email": obj.assigned_to.email}
        return None

    def get_comments(self, obj):
        return TaskCommentSerializer(obj.comments.all(), many=True).data

    def get_chats(self, obj):
        return TaskChatSerializer(obj.chats.all(), many=True).data

    def get_attachments(self, obj):
        return TaskAttachmentSerializer(obj.attachments.all(), many=True).data

    def get_subtasks(self, obj):
        return [{
            'id': s.id, 
            'title': s.title, 
            'status': s.status,
            'assigned_to': s.assigned_to.id if s.assigned_to else None,
            'assignee_name': s.assigned_to.get_full_name() or s.assigned_to.username if s.assigned_to else None
        } for s in obj.subtasks.all()]

    def get_blocked_by(self, obj):
        return [{'id': b.id, 'title': b.title, 'status': b.status} for b in obj.blocking_dependencies.all()]

    def get_checklists(self, obj):
        return [{'id': c.id, 'title': c.title, 'is_completed': c.is_completed} for c in obj.checklists.all()]

    def get_project(self, obj):
        return obj.project.name if obj.project else "General Workspace"

    def get_dueTime(self, obj):
        if obj.due_time:
            return obj.due_time.strftime('%I:%M %p')
        return 'EOD'


class ProjectSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateField(source='due_date', allow_null=True, required=False)
    team = serializers.JSONField(source='team_data', required=False)
    tasks = serializers.JSONField(source='tasks_data', required=False)
    imported_tasks = TaskSerializer(source='api_tasks', many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'progress', 'department', 'template_type', 'dueDate', 'team', 'tasks', 'imported_tasks', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Unknown"

    def create(self, validated_data):
        # Extract fields to handle them cleanly
        tasks_data = validated_data.pop('tasks_data', {"total": 0, "completed": 0})
        team_data = validated_data.pop('team_data', [])
        due_date = validated_data.pop('due_date', None)
        validated_data.pop('dueDate', None)

        # Create the project with core fields
        project = super().create(validated_data)
        
        # Set and persist the fields
        project.tasks_data = tasks_data
        project.team_data = team_data
        if due_date:
            project.due_date = due_date
        project.save()
        return project

    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks_data', None)
        team_data = validated_data.pop('team_data', None)
        due_date = validated_data.pop('due_date', None)
        validated_data.pop('dueDate', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if tasks_data is not None:
            # Merge with existing tasks_data
            current_tasks = instance.tasks_data if isinstance(instance.tasks_data, dict) else {}
            current_tasks.update(tasks_data)
            instance.tasks_data = current_tasks
            
        if team_data is not None:
            instance.team_data = team_data
            
        if due_date is not None:
            instance.due_date = due_date
            
        instance.save()
        return instance

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "System"

class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = '__all__'