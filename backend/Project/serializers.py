import datetime
from rest_framework import serializers
from .models import Project, ActivityLog, ProjectMilestone, Task, TaskComment, TaskAttachment, TaskChat

def parse_flexible_time(val):
    if val is None:
        return None
    if isinstance(val, datetime.time):
        return val
    if isinstance(val, datetime.datetime):
        return val.time()
        
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['', 'null', 'undefined', 'none', 'eod', '—', '-']:
        return None
        
    formats = [
        '%H:%M:%S',
        '%H:%M',
        '%I:%M %p',
        '%I:%M%p',
        '%I:%M:%S %p',
        '%I:%M:%S%p',
    ]
    for fmt in formats:
        try:
            return datetime.datetime.strptime(val_str, fmt).time()
        except ValueError:
            pass
            
    try:
        from django.utils.dateparse import parse_time
        t = parse_time(val_str)
        if t is not None:
            return t
    except Exception:
        pass

    return None

class FlexibleTimeField(serializers.TimeField):
    def to_internal_value(self, value):
        if value is None:
            return None
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned or cleaned.lower() in ['null', 'undefined', 'none', 'eod', '—', '-']:
                return None
            parsed = parse_flexible_time(cleaned)
            if parsed is not None:
                return parsed
        return super().to_internal_value(value)

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

class ProjectRelatedField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        if data is None or data == '' or str(data).lower() in ['null', 'undefined', 'none']:
            return None
        if isinstance(data, str) and not data.isdigit():
            proj = Project.objects.filter(name__iexact=data.strip()).first()
            if not proj:
                proj = Project._base_manager.filter(name__iexact=data.strip()).first()
            if proj:
                return proj
            return None
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError:
            # Fallback for valid numeric project IDs across tenant/site boundaries
            if str(data).isdigit():
                proj = Project._base_manager.filter(id=int(data)).first()
                if proj:
                    return proj
            raise

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    project_id = ProjectRelatedField(queryset=Project.objects.all(), source='project', required=False, allow_null=True)
    due_time = FlexibleTimeField(required=False, allow_null=True)
    dueTime = serializers.SerializerMethodField()
    raw_due_time = serializers.TimeField(source='due_time', read_only=True)
    
    comments = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    subtasks = serializers.SerializerMethodField()
    blocked_by = serializers.SerializerMethodField()
    checklists = serializers.SerializerMethodField()
    chats = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    assignee_detail = serializers.SerializerMethodField()
    assignees_detail = serializers.SerializerMethodField()
    health_status = serializers.ReadOnlyField()
    isUrgent = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = '__all__'

    def get_isUrgent(self, obj):
        return getattr(obj, 'is_urgent', False)

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

    def get_assignees_detail(self, obj):
        if hasattr(obj, 'assignees'):
            return [{"id": a.id, "name": a.get_full_name() or a.username, "email": a.email} for a in obj.assignees.all()]
        return []

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

class SimpleTaskSerializer(serializers.ModelSerializer):
    assignee_detail = serializers.SerializerMethodField()
    assignees_detail = serializers.SerializerMethodField()
    health_status = serializers.ReadOnlyField()
    project = serializers.SerializerMethodField()
    project_id = ProjectRelatedField(queryset=Project.objects.all(), source='project', required=False, allow_null=True)
    due_time = FlexibleTimeField(required=False, allow_null=True)
    raw_due_time = serializers.TimeField(source='due_time', read_only=True)

    created_by_name = serializers.SerializerMethodField()
    isUrgent = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'due_date', 'due_time', 
            'type', 'platform',
            'time_interval_minutes', 'assignee_detail', 'assignees_detail', 
            'health_status', 'created_at', 'estimated_effort', 
            'effort_unit', 'duration', 'project', 'project_id', 'created_by_name', 'raw_due_time',
            'is_urgent', 'isUrgent'
        ]

    def get_isUrgent(self, obj):
        return getattr(obj, 'is_urgent', False)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        if getattr(obj, 'project', None) and getattr(obj.project, 'created_by', None):
            return obj.project.created_by.get_full_name() or obj.project.created_by.username
        return "System"

    def get_project(self, obj):
        return obj.project.name if obj.project else "General Workspace"

    def get_assignee_detail(self, obj):
        if obj.assigned_to:
            name = obj.assigned_to.get_full_name() or obj.assigned_to.username
            return {"id": obj.assigned_to.id, "name": name, "email": obj.assigned_to.email}
        return None

    def get_assignees_detail(self, obj):
        if hasattr(obj, 'assignees'):
            return [{"id": a.id, "name": a.get_full_name() or a.username, "email": a.email} for a in obj.assignees.all()]
        return []

class ProjectListSerializer(ProjectSerializer):
    imported_tasks = SimpleTaskSerializer(source='api_tasks', many=True, read_only=True)

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