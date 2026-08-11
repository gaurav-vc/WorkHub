from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Project
from .serializers import ProjectSerializer, ProjectListSerializer
from core.utils import get_visible_users
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET', 'POST'])
def project_list_create(request):
    visible_users = get_visible_users(request.user)
    
    if request.method == 'GET':
        from django.db.models import Q
        user_dept = ""
        try:
            profile = getattr(request.user, 'auth_profile', None)
            if profile and profile.role_relationship:
                user_dept = profile.role_relationship.name
        except Exception:
            pass

        # 1. Base organization filter
        base_q = Q(created_by__in=visible_users)

        # 2. Strict access scope filtering
        scope_q = Q(department__in=['all', 'Entire Organization', ''])
        
        if request.user and request.user.is_authenticated:
            scope_q |= Q(created_by=request.user)
            
        if user_dept:
            scope_q |= Q(department__iexact=user_dept)
            
        q = base_q & scope_q
        
        search = request.GET.get('search')
        status_filter = request.GET.get('status')
        department_filter = request.GET.get('department')
        
        if search:
            q &= (Q(name__icontains=search) | Q(description__icontains=search))
        if status_filter and status_filter.lower() != 'all':
            q &= Q(status__iexact=status_filter)
        if department_filter and department_filter.lower() != 'all':
            q &= Q(department__iexact=department_filter)
            
        projects = Project.objects.filter(q).exclude(name__iexact="General Workspace").prefetch_related(
            'api_tasks',
            'api_tasks__assigned_to', 
            'api_tasks__assignees'
        ).distinct().order_by('-created_at')
        
        paginate = request.GET.get('paginate', 'true').lower() != 'false'
        
        if paginate:
            paginator = StandardResultsSetPagination()
            paginated_projects = paginator.paginate_queryset(projects, request)
            serializer = ProjectListSerializer(paginated_projects, many=True)
            return paginator.get_paginated_response(serializer.data)
        else:
            serializer = ProjectListSerializer(projects, many=True)
            return Response(serializer.data)
    elif request.method == 'POST':
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            # Default to first user if ID isn't provided (for smooth testing without auth)
            user_id = request.data.get('user_id')
            user = User.objects.filter(id=user_id).first() if user_id else User.objects.first()
            
        org = None
        if user:
            try:
                profile = getattr(user, 'org_profile', None)
                if profile and profile.organization:
                    org = profile.organization
            except Exception:
                pass
        
        try:
            serializer = ProjectSerializer(data=request.data)
            if serializer.is_valid():
                if org:
                    serializer.save(created_by=user, organization=org)
                else:
                    serializer.save(created_by=user)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
        except Exception as e:
            import traceback
            return Response({"error": str(e), "traceback": traceback.format_exc()}, status=500)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def project_detail(request, project_id):
    from django.db.models import Q
    visible_users = get_visible_users(request.user)
    
    user_dept = ""
    try:
        profile = getattr(request.user, 'auth_profile', None)
        if profile and profile.role_relationship:
            user_dept = profile.role_relationship.name
    except Exception:
        pass

    # 1. Base organization filter
    base_q = Q(created_by__in=visible_users)

    # 2. Strict access scope filtering
    scope_q = Q(department__in=['all', 'Entire Organization', ''])
    
    if request.user and request.user.is_authenticated:
        scope_q |= Q(created_by=request.user)
        
    if user_dept:
        scope_q |= Q(department__iexact=user_dept)
        
    q = base_q & scope_q

    try:
        project = Project.objects.filter(q, id=project_id).prefetch_related(
            'api_tasks',
            'api_tasks__comments', 'api_tasks__comments__user',
            'api_tasks__chats', 'api_tasks__chats__user',
            'api_tasks__attachments', 'api_tasks__attachments__uploaded_by',
            'api_tasks__subtasks', 'api_tasks__subtasks__assigned_to',
            'api_tasks__blocking_dependencies',
            'api_tasks__checklists',
            'api_tasks__assigned_to', 'api_tasks__created_by'
        ).distinct().first()
        if not project:
            return Response({"error": "Project not found or you don't have access."}, status=404)
    except Exception:
        return Response({"error": "Project not found."}, status=404)

    if request.method == 'GET':
        serializer = ProjectSerializer(project)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    elif request.method == 'DELETE':
        project.delete()
        return Response({"message": "Project deleted successfully."}, status=200)

@api_view(['POST'])
def duplicate_project(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Project not found."}, status=404)
        
    # Create new project
    new_project = Project.objects.create(
        name=f"{project.name} (Copy)",
        description=project.description,
        status=project.status,
        progress=project.progress,
        department=project.department,
        template_type=project.template_type,
        due_date=project.due_date,
        team_data=project.team_data,
        tasks_data=project.tasks_data,
        created_by=request.user if request.user.is_authenticated else project.created_by,
        organization=getattr(project, 'organization', None)
    )
    
    # Clone tasks
    from .models import Task as ApiTask
    old_tasks = ApiTask.objects.filter(project=project)
    task_mapping = {}
    
    for t in old_tasks:
        new_task = ApiTask.objects.create(
            title=t.title,
            project=new_project,
            assigned_to=t.assigned_to,
            created_by=request.user if request.user.is_authenticated else t.created_by,
            priority=t.priority,
            status=t.status,
            due_date=t.due_date,
            due_time=t.due_time,
            description=t.description,
            time_interval_minutes=t.time_interval_minutes,
            parent_task=None, # We'll map parent tasks in pass 2 if needed
            organization=getattr(t, 'organization', None)
        )
        task_mapping[t.id] = new_task
        
        # copy many-to-many assignees
        if t.assignees.exists():
            new_task.assignees.set(t.assignees.all())
            
    # Map parent tasks and dependencies if applicable
    for t in old_tasks:
        if t.parent_task_id and t.parent_task_id in task_mapping:
            new_task = task_mapping[t.id]
            new_task.parent_task = task_mapping[t.parent_task_id]
            new_task.save()
            
    return Response(ProjectSerializer(new_project).data, status=201)

import csv
from django.http import HttpResponse

@api_view(['GET'])
def export_project(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Project not found."}, status=404)
        
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{project.name}_tasks.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Task Title', 'Description', 'Status', 'Priority', 'Due Date', 'Assignee'])
    
    from .models import Task as ApiTask
    tasks = ApiTask.objects.filter(project=project)
    
    for t in tasks:
        assignee_name = ""
        if t.assigned_to:
            assignee_name = t.assigned_to.get_full_name() or t.assigned_to.username
        
        writer.writerow([
            t.title,
            t.description,
            t.status,
            t.priority,
            t.due_date,
            assignee_name
        ])
        
    return response

@api_view(['POST'])
def add_task(request, project_id):
    from .models import Task as ApiTask
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Project not found."}, status=404)
        
    title = request.data.get('title', 'Untitled Task')
    status = request.data.get('status', 'pending')
    due_date = request.data.get('due_date') or timezone.now().date()
    parent_task_id = request.data.get('parent_task_id')
    description = request.data.get('description', '')
    
    task_kwargs = {
        'project': project,
        'organization': getattr(project, 'organization', None),
        'site': getattr(project, 'site', None),
        'title': title,
        'status': status,
        'due_date': due_date,
        'description': description,
        'created_by': request.user if request.user.is_authenticated else None,
    }
    
    if 'time_interval_minutes' in request.data:
        try:
            task_kwargs['time_interval_minutes'] = int(request.data['time_interval_minutes'])
        except (ValueError, TypeError):
            pass
    if 'assigned_to' in request.data:
        assigned_to_id = request.data['assigned_to']
        if assigned_to_id is None or assigned_to_id == "unassigned":
            task_kwargs['assigned_to'] = None
        elif assigned_to_id == "self":
            task_kwargs['assigned_to'] = request.user
        else:
            try:
                from django.contrib.auth.models import User
                task_kwargs['assigned_to'] = User.objects.get(id=assigned_to_id)
            except Exception:
                pass
            
    if parent_task_id:
        try:
            parent_task = ApiTask.objects.get(id=parent_task_id)
            task_kwargs['parent_task'] = parent_task
        except ApiTask.DoesNotExist:
            pass

    task = ApiTask.objects.create(**task_kwargs)
    
    if 'assignees' in request.data:
        assignees_data = request.data['assignees']
        if isinstance(assignees_data, list):
            from django.contrib.auth.models import User
            users = User.objects.filter(id__in=assignees_data)
            task.assignees.set(users)

    # Recalculate if it's not a subtask, or if you want subtasks to count
    if not parent_task_id:
        new_progress = recalculate_project_progress(project)
    else:
        new_progress = project.progress
        
    # Generate audit log
    from workspace.models import TeamActivity
    if request.user.is_authenticated:
        action = 'created subtask' if parent_task_id else 'created task'
        TeamActivity.objects.create(
            user=request.user,
            action=action,
            target=task.title
        )

    return Response({
        "message": "Task added successfully.", 
        "task_id": task.id,
        "project_progress": new_progress
    }, status=201)

from django.db import transaction

def recalculate_project_progress(project):
    with transaction.atomic():
        # Lock the project row so rapid, simultaneous updates queue sequentially instead of crashing
        locked_project = Project.objects.select_for_update().get(id=project.id)
        
        total_tasks = locked_project.api_tasks.count()
        if total_tasks == 0:
            locked_project.progress = 0
        else:
            done_tasks = locked_project.api_tasks.filter(status__in=['done', 'completed']).count()
            locked_project.progress = int((done_tasks / total_tasks) * 100)
            
        locked_project.save(update_fields=['progress'])
        return locked_project.progress

@api_view(['GET', 'PATCH', 'DELETE'])
def update_task(request, task_id):
    from .models import Task as ApiTask
    from .serializers import TaskSerializer
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)
        
    if request.method == 'GET':
        return Response(TaskSerializer(task).data, status=200)

    project = task.project

    if request.method == 'DELETE':
        task.delete()
        new_progress = recalculate_project_progress(project) if project else 0
        return Response({"message": "Task deleted successfully.", "project_progress": new_progress}, status=200)

    if request.method == 'PATCH':
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if data.get('assigned_to') == 'self':
            data['assigned_to'] = request.user.id
        elif data.get('assigned_to') == 'unassigned':
            data['assigned_to'] = None

        serializer = TaskSerializer(task, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            new_progress = recalculate_project_progress(project) if project else 0
            
            # Additional response info that the frontend relies on
            response_data = serializer.data
            response_data['message'] = "Task updated successfully."
            response_data['project_progress'] = new_progress
            
            from workspace.models import TeamActivity
            if request.user.is_authenticated:
                TeamActivity.objects.create(
                    user=request.user,
                    action='updated task',
                    target=task.title
                )
            
            return Response(response_data, status=200)
        
        return Response({"error": "Invalid data.", "details": serializer.errors}, status=400)

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import parser_classes

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_task_attachment(request, task_id):
    from .models import Task as ApiTask, TaskAttachment
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)
        
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({"error": "No file uploaded"}, status=400)
        
    org = task.organization if hasattr(task, 'organization') else None
    if not org and hasattr(request.user, 'org_profile') and request.user.org_profile.organization:
        org = request.user.org_profile.organization

    attachment = TaskAttachment.objects.create(
        task=task,
        file=file_obj,
        uploaded_by=request.user if request.user.is_authenticated else None,
        organization=org
    )
    
    return Response({"message": "File uploaded successfully", "id": attachment.id, "file_name": attachment.file.name}, status=201)

@api_view(['POST'])
def add_subtask(request, task_id):
    from .models import Task as ApiTask
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    title = request.data.get('title')
    if title:
        # Create a subtask
        ApiTask.objects.create(
            title=title,
            parent_task=task,
            project=task.project,
            created_by=request.user if request.user.is_authenticated else None,
            assigned_to=request.user if request.user.is_authenticated else None,
            status='pending',
            organization=getattr(task, 'organization', None),
            site=getattr(task, 'site', None)
        )
        return Response({"status": "subtask added"})
    return Response({"error": "title required"}, status=400)

@api_view(['POST'])
def add_checklist(request, task_id):
    from .models import Task as ApiTask, TaskChecklist
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    title = request.data.get('title')
    if title:
        TaskChecklist.objects.create(task=task, title=title)
        return Response({"status": "checklist added"})
    return Response({"error": "title required"}, status=400)

@api_view(['POST'])
def add_chat(request, task_id):
    from .models import Task as ApiTask, TaskChat
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    text = request.data.get('text')
    if text:
        chat = TaskChat.objects.create(
            task=task, 
            text=text, 
            user=request.user if request.user.is_authenticated else None
        )
        from .serializers import TaskChatSerializer
        return Response(TaskChatSerializer(chat).data, status=status.HTTP_201_CREATED)
    return Response({"error": "text required"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def add_comment(request, task_id):
    from .models import Task as ApiTask, TaskComment
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    text = request.data.get('text')
    if text:
        comment = TaskComment.objects.create(
            task=task, 
            text=text, 
            user=request.user if request.user.is_authenticated else None
        )
        from .serializers import TaskCommentSerializer
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
    return Response({"error": "text required"}, status=status.HTTP_400_BAD_REQUEST)


from core.views import TenantModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import json

class TaskViewSet(TenantModelViewSet):
    from .models import Task
    queryset = Task.objects.all()
    from .serializers import TaskSerializer, SimpleTaskSerializer
    serializer_class = TaskSerializer

    def get_serializer_class(self):
        from .serializers import SimpleTaskSerializer
        if self.action == 'list':
            return SimpleTaskSerializer
        return self.serializer_class
    from role_base_access.permissions import RBACPermission
    permission_classes = [IsAuthenticated, RBACPermission]
    rbac_module = 'tasks-projects'

    def perform_create(self, serializer, **kwargs):
        kwargs['created_by'] = self.request.user
        super().perform_create(serializer, **kwargs)

    def _has_global_access(self, user):
        if user.is_superuser:
            return True
            
        profile = getattr(user, 'auth_profile', None)
        if profile:
            if profile.user_type in ['super_user', 'site_admin']:
                return True
            elif profile.role_relationship:
                from role_base_access.models import Role as RBACRole
                rbac_role = RBACRole.objects.filter(name=profile.role_relationship.name).first()
                if rbac_role and getattr(rbac_role, 'cross_department_access', False):
                    return True
                    
        emp_profile = getattr(user, 'res_employee', None)
        if emp_profile and emp_profile.role and emp_profile.role.lower() in ['admin', 'site_admin', 'super_user', 'site admin']:
            return True
            
        return False

    def _notify_workspace(self, org, event_type, data):
        if not org:
            return
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"org_{org.id}",
                {
                    "type": "workspace_event",
                    "event_type": event_type,
                    "data": data
                }
            )
        except Exception as e:
            print(f"Error notifying workspace: {e}")

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optimize N+1 queries heavily used by the TaskSerializer
        queryset = queryset.select_related(
            'project', 'project__created_by', 'assigned_to', 'created_by'
        ).prefetch_related(
            'comments', 'comments__user',
            'attachments', 'attachments__uploaded_by',
            'subtasks', 'subtasks__assigned_to',
            'blocking_dependencies',
            'checklists',
            'chats', 'chats__user'
        )

        user = self.request.user
        global_access = self._has_global_access(user)

        if global_access:
            return queryset
            
        from django.db.models import Q
        user_dept = ""
        profile = getattr(user, 'auth_profile', None)
        try:
            if profile and profile.role_relationship:
                user_dept = profile.role_relationship.name
        except Exception:
            pass
            
        # Users can see tasks if:
        # 1. They are assigned to it
        # 2. They created it
        # 3. They created the parent project
        # 4. The parent project belongs to their department (or is accessible to 'all')
        
        project_scope_q = Q(project__department__in=['all', 'Entire Organization', ''])
        if user_dept:
            project_scope_q |= Q(project__department__iexact=user_dept)

        return queryset.filter(
            Q(assigned_to=user) | 
            Q(assignees=user) | 
            Q(created_by=user) | 
            Q(project__created_by=user) |
            project_scope_q
        ).distinct()

    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        # Extract filters
        search = request.query_params.get('search', '')
        priority = request.query_params.get('priority', 'all')
        status_filter = request.query_params.get('status', 'all')
        assignee = request.query_params.get('assignee', '')
        view_mode = request.query_params.get('view_mode', 'my_tasks')

        queryset = self.filter_queryset(self.get_queryset())
        user = request.user

        from django.db.models import Q
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if priority and priority != 'all':
            queryset = queryset.filter(priority=priority)
        if status_filter and status_filter != 'all':
            if status_filter == 'todo':
                queryset = queryset.filter(status__in=["pending", "open", "planning", "todo"])
            elif status_filter == 'in-progress':
                queryset = queryset.filter(status="in_progress")
            elif status_filter == 'blocked':
                queryset = queryset.filter(status__in=["delayed", "on_hold"])
            elif status_filter == 'done':
                queryset = queryset.filter(status__in=["completed", "done"])
            else:
                queryset = queryset.filter(status=status_filter)
        
        if assignee:
            queryset = queryset.filter(Q(assigned_to__id=assignee) | Q(assignees__id=assignee))
            
        if view_mode == 'my_tasks':
            assigned_q = Q(assigned_to=user) | Q(assignees=user)
            unassigned_q = Q(created_by=user) & Q(assigned_to__isnull=True) & Q(assignees__isnull=True)
            queryset = queryset.filter(assigned_q | unassigned_q)

        queryset = queryset.distinct()
        
        # Fast query for Tasks (IDs and sorting fields only)
        tasks_meta = list(queryset.values('id', 'created_at'))
        for t in tasks_meta:
            t['type'] = 'task'

        cards_meta = []
        # Fast query for Board Cards (IDs and sorting fields only)
        if user.is_authenticated:
            from boards.models import Card
            org = self.get_organization()
            global_access = self._has_global_access(user)
            
            card_q = Q(organization=org)
            if not global_access:
                card_q &= (Q(assignee=user) | Q(created_by=user))
                
            if search:
                card_q &= (Q(title__icontains=search) | Q(description__icontains=search))
            if priority and priority != 'all':
                card_q &= Q(priority=priority)
            if status_filter and status_filter != 'all':
                if status_filter == 'todo':
                    card_q &= Q(status__in=["pending", "todo", "open"])
                elif status_filter == 'in-progress':
                    card_q &= Q(status="in_progress")
                elif status_filter == 'blocked':
                    card_q &= Q(status__in=["delayed", "blocked", "on_hold"])
                elif status_filter == 'done':
                    card_q &= Q(status__in=["completed", "done"])
                else:
                    card_q &= Q(status=status_filter)
            if assignee:
                card_q &= Q(assignee__id=assignee)
            if view_mode == 'my_tasks':
                card_assigned_q = Q(assignee=user)
                card_unassigned_q = Q(created_by=user) & Q(assignee__isnull=True)
                card_q &= (card_assigned_q | card_unassigned_q)
                
            cards = Card.objects.filter(card_q).distinct()
            cards_meta = list(cards.values('id', 'created_at'))
            for c in cards_meta:
                c['type'] = 'card'

        # Merge and sort the lightweight metadata list
        combined_meta = tasks_meta + cards_meta
        combined_meta.sort(key=lambda x: str(x.get('created_at') or ''), reverse=True)

        # Python-level pagination over lightweight list
        paginate = request.query_params.get('paginate', 'true').lower() != 'false'
        
        if paginate:
            paginator = StandardResultsSetPagination()
            page_meta = paginator.paginate_queryset(combined_meta, request, view=self)
            if page_meta is None:
                page_meta = combined_meta
        else:
            paginator = None
            page_meta = combined_meta

        # Fetch exactly the 12 full objects using prefetch
        task_ids = [m['id'] for m in page_meta if m['type'] == 'task']
        card_ids = [m['id'] for m in page_meta if m['type'] == 'card']
        
        final_data = []

        if task_ids:
            # Chunk task_ids into batches of 900 to avoid SQLite limits
            for i in range(0, len(task_ids), 900):
                chunk_ids = task_ids[i:i + 900]
                page_tasks = queryset.filter(id__in=chunk_ids)
                serializer = self.get_serializer(page_tasks, many=True)
                final_data.extend(serializer.data)

        if card_ids:
            from boards.models import Card
            # Chunk card_ids as well
            for i in range(0, len(card_ids), 900):
                chunk_ids = card_ids[i:i + 900]
                page_cards = Card.objects.filter(id__in=chunk_ids).select_related('column__board', 'assignee', 'created_by')
                for c in page_cards:
                    card_data = {
                    "id": f"board_card_{c.id}",
                    "title": c.title,
                    "description": c.description,
                    "status": c.status,
                    "priority": c.priority or "P3",
                    "due_date": c.due_date.isoformat() if c.due_date else None,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "project": f"Board: {c.column.board.title}" if getattr(c, 'column', None) and getattr(c.column, 'board', None) else "Board Task",
                    "project_id": getattr(c.column.board, 'id', None) if getattr(c, 'column', None) else None,
                    "task_type": "board",
                    "assignee_detail": {
                        "id": c.assignee.id, "name": c.assignee.get_full_name() or c.assignee.username, "email": c.assignee.email
                    } if c.assignee else None,
                    "created_by_name": c.created_by.get_full_name() or c.created_by.username if c.created_by else "System",
                    "comments": [], "attachments": [], "subtasks": [], "blocked_by": [], "checklists": [], "chats": []
                }
                final_data.append(card_data)

        # Re-sort the fetched items to preserve their exact order
        final_data.sort(key=lambda x: str(x.get('created_at') or ''), reverse=True)

        if paginate and hasattr(paginator, 'page') and paginator.page:
            return paginator.get_paginated_response(final_data)
        
        return Response(final_data)

    def create(self, request, *args, **kwargs):
        org = self.get_organization()
        
        # Make a mutable copy of the data
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Map frontend camelCase to backend snake_case
        if data.get('dueDate'):
            data['due_date'] = data.get('dueDate')
        if data.get('dueTime'):
            data['due_time'] = data.get('dueTime')
        if data.get('dependentTask') and data.get('dependentTask') != "null":
            data['dependency'] = data.get('dependentTask')
        if data.get('estimatedEffort') is not None:
            data['estimated_effort'] = data.get('estimatedEffort')
        if data.get('effortUnit'):
            data['effort_unit'] = data.get('effortUnit')
            
        if data.get('priority'):
            # Frontend sends "P1 Critical", etc. Backend expects "P1", "P2", etc.
            data['priority'] = str(data.get('priority'))[:2]
            
        if data.get('dueTime'):
            data['due_time'] = data.get('dueTime')
            
        # Provide default due_date as model requires it
        if not data.get('due_date'):
            from django.utils import timezone
            data['due_date'] = timezone.now().date().isoformat()
            
        # Handle assigned_to
        if data.get('assignedTo') and data.get('assignedTo') != "null":
            data['assigned_to'] = data.get('assignedTo')
            
        assignees = data.get('assigneeIds', [])
        if isinstance(assignees, str):
            import json
            try:
                assignees = json.loads(assignees)
            except:
                assignees = []
                
        assigned_to_user = request.user
        if data.get('taskType') == 'assign' and assignees and len(assignees) > 0:
            try:
                from django.contrib.auth.models import User
                assigned_to_user = User.objects.get(id=assignees[0])
            except:
                pass
        elif 'assigned_to' in data and data['assigned_to'] and data['assigned_to'] != "null":
            try:
                from django.contrib.auth.models import User
                assigned_to_user = User.objects.get(id=data['assigned_to'])
            except:
                pass

        project_id = data.get('project_id') or data.get('project')
        project = None
        if project_id and str(project_id).isdigit():
            try:
                project = Project.objects.get(id=int(project_id))
            except Project.DoesNotExist:
                pass
        elif project_id and isinstance(project_id, str):
            try:
                project = Project.objects.get(name__iexact=project_id)
            except Project.DoesNotExist:
                pass
        
        if not project:
            project, _ = Project.objects.get_or_create(
                name="General Workspace",
                organization=org,
                defaults={'created_by': request.user, 'department': 'General'}
            )
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        from .models import Task, TaskChecklist
        task = serializer.save(created_by=request.user, project=project, assigned_to=assigned_to_user, organization=org)
        
        # Save multi-assignees
        if assignees and len(assignees) > 0:
            try:
                from django.contrib.auth.models import User
                users = User.objects.filter(id__in=assignees)
                task.assignees.set(users)
            except Exception:
                pass
        
        subtasks_data = data.get('subtasks', [])
        if isinstance(subtasks_data, str):
            try:
                subtasks_data = json.loads(subtasks_data)
            except:
                subtasks_data = []
        
        for st in subtasks_data:
            Task.objects.create(
                title=st.get('title', 'Untitled Subtask'),
                status=st.get('status', 'pending'),
                parent_task=task,
                project=project,
                created_by=request.user,
                assigned_to=request.user,
                due_date=task.due_date,
                organization=org
            )
            
        checklists_data = request.data.get('checklists', [])
        if isinstance(checklists_data, str):
            try:
                checklists_data = json.loads(checklists_data)
            except:
                checklists_data = []
                
        for cl in checklists_data:
            TaskChecklist.objects.create(
                task=task,
                title=cl.get('title') or cl.get('text', 'Untitled Item'),
                is_completed=cl.get('is_completed') or cl.get('completed', False),
                organization=org
            )

        # Handle file attachment
        if 'file' in request.FILES:
            from .models import TaskAttachment
            TaskAttachment.objects.create(
                task=task,
                file=request.FILES['file'],
                uploaded_by=request.user,
                organization=org
            )

        headers = self.get_success_headers(serializer.data)
        
        # Notify workspace about the new task
        self._notify_workspace(org, 'tasks_updated', {'action': 'create', 'task_id': task.id})
        
        return Response(self.get_serializer(task).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Map frontend camelCase to backend snake_case for updates
        if data.get('dueDate'):
            data['due_date'] = data.get('dueDate')
        if data.get('dueTime'):
            data['due_time'] = data.get('dueTime')
        if data.get('estimatedEffort') is not None:
            data['estimated_effort'] = data.get('estimatedEffort')
        if data.get('effortUnit'):
            data['effort_unit'] = data.get('effortUnit')
            
        assignees = data.get('assigneeIds', [])
        if isinstance(assignees, str):
            import json
            try:
                assignees = json.loads(assignees)
            except:
                assignees = []
                
        if data.get('taskType') == 'assign' and assignees and len(assignees) > 0:
            try:
                from django.contrib.auth.models import User
                data['assigned_to'] = User.objects.get(id=assignees[0]).id
            except:
                pass
        elif data.get('assignedTo') and data.get('assignedTo') != "null":
            data['assigned_to'] = data.get('assignedTo')
            
        old_status = instance.status
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Save multi-assignees if passed
        if 'assigneeIds' in data:
            if assignees and len(assignees) > 0:
                try:
                    from django.contrib.auth.models import User
                    users = User.objects.filter(id__in=assignees)
                    instance.assignees.set(users)
                except Exception:
                    pass
            else:
                instance.assignees.clear()

        # Reload instance to get new status
        instance.refresh_from_db()
        
        # Update Points System
        done_statuses = ['done', 'completed']
        if old_status not in done_statuses and instance.status in done_statuses:
            # Award points
            from hr_requests.models import LeaderboardEntry
            user = instance.assigned_to or instance.created_by
            if user:
                entry, _ = LeaderboardEntry.objects.get_or_create(user=user)
                entry.points += 10
                entry.level = (entry.points // 100) + 1
                entry.save()
        elif old_status in done_statuses and instance.status not in done_statuses:
            # Deduct points
            from hr_requests.models import LeaderboardEntry
            user = instance.assigned_to or instance.created_by
            if user:
                entry, _ = LeaderboardEntry.objects.get_or_create(user=user)
                entry.points = max(0, entry.points - 10)
                entry.level = (entry.points // 100) + 1
                entry.save()

        from .models import Task, TaskChecklist
        
        # Handle subtasks sync
        subtasks_data = data.get('subtasks', [])
        if isinstance(subtasks_data, str):
            try:
                subtasks_data = json.loads(subtasks_data)
            except:
                subtasks_data = []
        if isinstance(subtasks_data, list):
            existing_subtask_ids = set()
            for st in subtasks_data:
                st_id = st.get('id')
                if st_id and str(st_id).startswith('st-'):
                    # New subtask from frontend UI
                    new_st = Task.objects.create(
                        title=st.get('title', 'Untitled Subtask'),
                        status=st.get('status', 'pending'),
                        parent_task=instance,
                        project=instance.project,
                        created_by=request.user,
                        assigned_to=instance.assigned_to,
                        due_date=instance.due_date,
                        organization=instance.organization
                    )
                    existing_subtask_ids.add(new_st.id)
                elif st_id:
                    try:
                        existing = Task.objects.get(id=st_id, parent_task=instance)
                        existing.title = st.get('title', existing.title)
                        existing.status = st.get('status', existing.status)
                        existing.save()
                        existing_subtask_ids.add(existing.id)
                    except:
                        pass
            
            if data.get('subtasks'):
                # Delete subtasks that were removed in the UI
                Task.objects.filter(parent_task=instance).exclude(id__in=existing_subtask_ids).delete()

        # Handle checklists sync
        checklists_data = data.get('checklist', [])
        if not checklists_data:
            checklists_data = data.get('checklists', [])
            
        if isinstance(checklists_data, str):
            try:
                checklists_data = json.loads(checklists_data)
            except:
                checklists_data = []
        if isinstance(checklists_data, list):
            existing_cl_ids = set()
            for cl in checklists_data:
                cl_id = cl.get('id')
                if cl_id and str(cl_id).startswith('cl-'):
                    new_cl = TaskChecklist.objects.create(
                        task=instance,
                        title=cl.get('title') or cl.get('text', 'Untitled Item'),
                        is_completed=cl.get('is_completed') or cl.get('completed', False),
                        organization=instance.organization
                    )
                    existing_cl_ids.add(new_cl.id)
                elif cl_id:
                    try:
                        existing = TaskChecklist.objects.get(id=cl_id, task=instance)
                        existing.title = cl.get('title') or cl.get('text', existing.title)
                        existing.is_completed = cl.get('is_completed') or cl.get('completed', existing.is_completed)
                        existing.save()
                        existing_cl_ids.add(existing.id)
                    except:
                        pass
            
            if data.get('checklist') or data.get('checklists'):
                TaskChecklist.objects.filter(task=instance).exclude(id__in=existing_cl_ids).delete()
                
        checklist_updates = request.data.get('checklist_updates', [])
        for cl_upd in checklist_updates:
            try:
                cl = TaskChecklist.objects.get(id=cl_upd['id'], task=instance)
                cl.is_completed = cl_upd['is_completed']
                cl.save()
            except:
                pass

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        self._notify_workspace(instance.organization, 'tasks_updated', {'action': 'update', 'task_id': instance.id})

        return Response(self.get_serializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        org = instance.organization
        task_id = instance.id
        
        response = super().destroy(request, *args, **kwargs)
        
        self._notify_workspace(org, 'tasks_updated', {'action': 'delete', 'task_id': task_id})
        return response