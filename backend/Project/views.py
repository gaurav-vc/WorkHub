from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Project
from .serializers import ProjectSerializer, ProjectListSerializer
from core.utils import get_visible_users
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProjectListPagination(PageNumberPagination):
    page_size = 10
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
            paginator = ProjectListPagination()
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
    
    # NEW: Extracting extra fields that are passed from frontend (including AI Assistant / Task Type fields)
    for field in ['priority', 'due_time', 'type', 'platform', 'estimated_effort', 'effort_unit', 'color', 'start_day', 'duration', 'is_queued']:
        if field in request.data and request.data[field] not in [None, ""]:
            # Typecasting for specific fields
            if field in ['estimated_effort', 'start_day', 'duration']:
                try:
                    task_kwargs[field] = int(request.data[field])
                except (ValueError, TypeError):
                    pass
            elif field == 'is_queued':
                task_kwargs[field] = str(request.data[field]).lower() == 'true'
            else:
                task_kwargs[field] = request.data[field]

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

    from core.concurrency import robust_db_write
    def _create_task():
        t = ApiTask.objects.create(**task_kwargs)
        if 'assignees' in request.data:
            assignees_data = request.data['assignees']
            if isinstance(assignees_data, list):
                from django.contrib.auth.models import User
                users = User.objects.filter(id__in=assignees_data)
                t.assignees.set(users)
        return t

    task = robust_db_write(_create_task)

    # Recalculate if it's not a subtask, or if you want subtasks to count
    if not parent_task_id:
        new_progress = recalculate_project_progress(project)
    else:
        new_progress = getattr(project, 'progress', 0)
        
    # Generate audit log
    from workspace.models import TeamActivity
    if request.user.is_authenticated:
        try:
            action = 'created subtask' if parent_task_id else 'created task'
            TeamActivity.objects.create(
                user=request.user,
                action=action,
                target=task.title
            )
        except Exception:
            pass

    return Response({
        "message": "Task added successfully.", 
        "task_id": task.id,
        "project_progress": new_progress
    }, status=201)

from django.db import transaction

def recalculate_project_progress(project):
    from core.concurrency import robust_db_write
    def _do_calc():
        total_tasks = project.api_tasks.count()
        if total_tasks == 0:
            new_prog = 0
        else:
            done_tasks = project.api_tasks.filter(status__in=['done', 'completed']).count()
            new_prog = int((done_tasks / total_tasks) * 100)
            
        Project.objects.filter(id=project.id).update(progress=new_prog)
        project.progress = new_prog
        return new_prog

    try:
        return robust_db_write(_do_calc)
    except Exception as e:
        return getattr(project, 'progress', 0)

@api_view(['GET', 'PATCH', 'DELETE'])
def update_task(request, task_id):
    from .models import Task as ApiTask
    from .serializers import TaskSerializer
    from core.concurrency import robust_db_write
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found."}, status=404)
        
    if request.method == 'GET':
        return Response(TaskSerializer(task).data, status=200)

    project = task.project

    if request.method == 'DELETE':
        robust_db_write(task.delete)
        new_progress = recalculate_project_progress(project) if project else 0
        return Response({"message": "Task deleted successfully.", "project_progress": new_progress}, status=200)

    if request.method == 'PATCH':
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if data.get('assigned_to') == 'self':
            data['assigned_to'] = request.user.id
        elif data.get('assigned_to') == 'unassigned':
            data['assigned_to'] = None

        if 'dueTime' in data or 'due_time' in data:
            from .serializers import parse_flexible_time
            raw_time = data.get('due_time') if 'due_time' in data else data.get('dueTime')
            data['due_time'] = parse_flexible_time(raw_time)
        data.pop('dueTime', None)

        serializer = TaskSerializer(task, data=data, partial=True)
        if serializer.is_valid():
            robust_db_write(serializer.save)
            new_progress = recalculate_project_progress(project) if project else 0
            
            # Additional response info that the frontend relies on
            response_data = serializer.data
            response_data['message'] = "Task updated successfully."
            response_data['project_progress'] = new_progress
            
            from workspace.models import TeamActivity
            if request.user.is_authenticated:
                try:
                    act = 'completed task' if task.status in ['done', 'completed'] else 'updated task'
                    TeamActivity.objects.create(
                        user=request.user,
                        action=act,
                        target=task.title
                    )
                except Exception:
                    pass
            
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
    from core.concurrency import robust_db_write
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    title = request.data.get('title')
    if title:
        # Create a subtask
        robust_db_write(lambda: ApiTask.objects.create(
            title=title,
            parent_task=task,
            project=task.project,
            created_by=request.user if request.user.is_authenticated else None,
            assigned_to=request.user if request.user.is_authenticated else None,
            status='pending',
            organization=getattr(task, 'organization', None),
            site=getattr(task, 'site', None)
        ))
        return Response({"status": "subtask added"})
    return Response({"error": "title required"}, status=400)

@api_view(['POST'])
def add_checklist(request, task_id):
    from .models import Task as ApiTask, TaskChecklist
    from core.concurrency import robust_db_write
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    title = request.data.get('title')
    if title:
        robust_db_write(lambda: TaskChecklist.objects.create(task=task, title=title))
        return Response({"status": "checklist added"})
    return Response({"error": "title required"}, status=400)

@api_view(['POST'])
def toggle_checklist(request, task_id):
    from .models import Task as ApiTask, TaskChecklist
    from core.concurrency import robust_db_write
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    checklist_id = request.data.get('checklist_id')
    try:
        ck = TaskChecklist.objects.get(id=checklist_id, task=task)
        ck.is_completed = not ck.is_completed
        robust_db_write(ck.save)
        return Response({"status": "toggled", "is_completed": ck.is_completed})
    except TaskChecklist.DoesNotExist:
        return Response({"error": "checklist not found"}, status=404)

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

@api_view(['PATCH'])
def edit_comment(request, task_id):
    from .models import Task as ApiTask, TaskComment
    try:
        task = ApiTask.objects.get(id=task_id)
    except ApiTask.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
        
    comment_id = request.data.get('comment_id')
    text = request.data.get('text')
    
    if not comment_id or not text:
        return Response({"error": "comment_id and text required"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        comment = TaskComment.objects.get(id=comment_id, task=task)
        comment.text = text
        comment.save()
        from .serializers import TaskCommentSerializer
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_200_OK)
    except TaskComment.DoesNotExist:
        return Response({"error": "comment not found"}, status=status.HTTP_404_NOT_FOUND)


from core.views import TenantModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import json
import csv
import io

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

    def get_object(self):
        try:
            return super().get_object()
        except Exception:
            # Fallback for concurrent updates: resolve task by pk and enforce object permissions
            lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
            lookup_val = self.kwargs.get(lookup_url_kwarg)
            if lookup_val:
                from .models import Task
                task = Task._base_manager.select_related(
                    'project', 'project__created_by', 'assigned_to', 'created_by'
                ).filter(pk=lookup_val).first()
                if task:
                    self.check_object_permissions(self.request, task)
                    return task
            raise

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
        creator = request.query_params.get('creator', '')
        view_mode = request.query_params.get('view_mode', 'my_tasks')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        is_delayed = request.query_params.get('is_delayed')

        queryset = self.filter_queryset(self.get_queryset())
        user = request.user

        from django.db.models import Q
        from boards.models import Card

        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if priority and priority != 'all':
            queryset = queryset.filter(priority=priority)
        
        if assignee and assignee != 'all':
            if assignee == 'unassigned':
                queryset = queryset.filter(Q(assigned_to__isnull=True) & Q(assignees__isnull=True))
            else:
                queryset = queryset.filter(Q(assigned_to__id=assignee) | Q(assignees__id=assignee))
                
        if creator and creator != 'all':
            queryset = queryset.filter(created_by__id=creator)
            
        if is_delayed == 'true':
            from django.utils import timezone
            queryset = queryset.filter(
                due_date__lt=timezone.now().date()
            ).exclude(
                status__in=["completed", "done"]
            )
            
        if view_mode == 'my_tasks':
            assigned_q = Q(assigned_to=user) | Q(assignees=user)
            unassigned_q = Q(created_by=user) & Q(assigned_to__isnull=True)
            queryset = queryset.filter(assigned_q | unassigned_q)

        if start_date:
            try:
                from datetime import datetime, timedelta
                from django.utils import timezone
                start_dt = datetime.strptime(start_date.split('T')[0], '%Y-%m-%d')
                start_dt = timezone.make_aware(start_dt)
                queryset = queryset.filter(created_at__gte=start_dt)
            except Exception as e:
                print(f"Error parsing start_date: {e}")
                
        if end_date:
            try:
                from datetime import datetime, timedelta
                from django.utils import timezone
                end_dt = datetime.strptime(end_date.split('T')[0], '%Y-%m-%d')
                end_dt = timezone.make_aware(end_dt) + timedelta(days=1, microseconds=-1)
                queryset = queryset.filter(created_at__lte=end_dt)
            except Exception as e:
                print(f"Error parsing end_date: {e}")

        queryset = queryset.distinct()

        # Build card_q with same base filters
        card_q = Q()
        if user.is_authenticated:
            org = self.get_organization()
            global_access = self._has_global_access(user)
            card_q = Q(organization=org)
            if not global_access:
                card_q &= (Q(assignee=user) | Q(created_by=user))
                
            if search:
                card_q &= (Q(title__icontains=search) | Q(description__icontains=search))
            if priority and priority != 'all':
                card_q &= Q(priority=priority)
            if assignee and assignee != 'all':
                if assignee == 'unassigned':
                    card_q &= Q(assignee__isnull=True)
                else:
                    card_q &= Q(assignee__id=assignee)
            if view_mode == 'my_tasks':
                card_assigned_q = Q(assignee=user)
                card_unassigned_q = Q(created_by=user) & Q(assignee__isnull=True)
                card_q &= (card_assigned_q | card_unassigned_q)
                
            if start_date:
                try:
                    from datetime import datetime
                    from django.utils import timezone
                    start_dt = datetime.strptime(start_date.split('T')[0], '%Y-%m-%d')
                    start_dt = timezone.make_aware(start_dt)
                    card_q &= Q(created_at__gte=start_dt)
                except Exception:
                    pass
            if end_date:
                try:
                    from datetime import datetime, timedelta
                    from django.utils import timezone
                    end_dt = datetime.strptime(end_date.split('T')[0], '%Y-%m-%d')
                    end_dt = timezone.make_aware(end_dt) + timedelta(days=1, microseconds=-1)
                    card_q &= Q(created_at__lte=end_dt)
                except Exception:
                    pass

        # Calculate stable status counts across ALL tasks and cards before status_filter is applied
        status_counts = {"todo": 0, "in_progress": 0, "blocked": 0, "done": 0}
        tasks_status_list = list(queryset.values_list('status', flat=True))
        cards_status_list = list(Card.objects.filter(card_q).values_list('status', flat=True)) if user.is_authenticated else []
        for s in tasks_status_list + cards_status_list:
            s_str = str(s or 'pending').lower()
            if s_str in ('completed', 'done'): status_counts['done'] += 1
            elif s_str in ('in_progress', 'in-progress'): status_counts['in_progress'] += 1
            elif s_str in ('delayed', 'blocked', 'on_hold'): status_counts['blocked'] += 1
            else: status_counts['todo'] += 1

        # Now apply status_filter to restrict paginated items
        if status_filter and status_filter != 'all':
            if status_filter == 'todo':
                queryset = queryset.filter(status__in=["pending", "open", "planning", "todo"])
                if user.is_authenticated:
                    card_q &= Q(status__in=["pending", "todo", "open"])
            elif status_filter == 'in-progress':
                queryset = queryset.filter(status="in_progress")
                if user.is_authenticated:
                    card_q &= Q(status="in_progress")
            elif status_filter == 'blocked':
                queryset = queryset.filter(status__in=["delayed", "on_hold"])
                if user.is_authenticated:
                    card_q &= Q(status__in=["delayed", "blocked", "on_hold"])
            elif status_filter == 'done':
                queryset = queryset.filter(status__in=["completed", "done"])
                if user.is_authenticated:
                    card_q &= Q(status__in=["completed", "done"])
            else:
                queryset = queryset.filter(status=status_filter)
                if user.is_authenticated:
                    card_q &= Q(status=status_filter)

        # Fast query for Tasks (IDs and sorting fields only)
        tasks_meta = list(queryset.values('id', 'created_at', 'status'))
        for t in tasks_meta:
            t['type'] = 'task'

        cards_meta = []
        if user.is_authenticated:
            cards = Card.objects.filter(card_q).distinct()
            cards_meta = list(cards.values('id', 'created_at', 'status'))
            for c in cards_meta:
                c['type'] = 'card'

        # Merge and sort the lightweight metadata list
        combined_meta = tasks_meta + cards_meta
        combined_meta.sort(key=lambda x: (
            0 if str(x.get('status') or '').lower() in ['completed', 'done'] else 1,
            str(x.get('created_at') or '')
        ), reverse=True)

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

        # Fetch exactly the 50 full objects using prefetch
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
                        "isUrgent": bool(getattr(c, 'is_urgent', False)),
                        "is_urgent": bool(getattr(c, 'is_urgent', False)),
                        "assignee_detail": {
                            "id": c.assignee.id, "name": c.assignee.get_full_name() or c.assignee.username, "email": c.assignee.email
                        } if c.assignee else None,
                        "created_by_name": c.created_by.get_full_name() or c.created_by.username if c.created_by else "System",
                        "comments": [], "attachments": [], "subtasks": [], "blocked_by": [], "checklists": [], "chats": []
                    }
                    final_data.append(card_data)
        # Re-sort the fetched items to preserve their exact order
        final_data.sort(key=lambda x: (
            0 if str(x.get('status') or '').lower() in ['completed', 'done'] else 1,
            str(x.get('created_at') or '')
        ), reverse=True)

        if paginate and hasattr(paginator, 'page') and paginator.page:
            resp = paginator.get_paginated_response(final_data)
            resp.data['status_counts'] = status_counts
            resp.data['overall_total'] = sum(status_counts.values())
            return resp
        
        return Response(final_data)

    def _execute_task_create(self, request, data, project, assigned_to_user, org, assignees):
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
        return task

    def create(self, request, *args, **kwargs):
        org = self.get_organization()
        if not org and request.user and request.user.is_authenticated:
            try:
                org_profile = getattr(request.user, 'org_profile', None)
                if org_profile and org_profile.organization:
                    org = org_profile.organization
                else:
                    from organization.models import Organization
                    org = Organization.objects.filter(members=request.user).first() or Organization.objects.first()
            except Exception:
                pass
        
        # Make a mutable copy of the data
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Map frontend camelCase to backend snake_case
        if data.get('dueDate'):
            data['due_date'] = data.get('dueDate')
        if 'dueTime' in data or 'due_time' in data:
            from .serializers import parse_flexible_time
            raw_time = data.get('due_time') if 'due_time' in data else data.get('dueTime')
            data['due_time'] = parse_flexible_time(raw_time)
        data.pop('dueTime', None)
        if data.get('dependentTask') and data.get('dependentTask') != "null":
            data['dependency'] = data.get('dependentTask')
        if data.get('estimatedEffort') is not None:
            data['estimated_effort'] = data.get('estimatedEffort')
        if data.get('effortUnit'):
            data['effort_unit'] = data.get('effortUnit')
            
        if data.get('priority'):
            # Frontend sends "P1 Critical", etc. Backend expects "P1", "P2", etc.
            data['priority'] = str(data.get('priority'))[:2]
            
        if 'isUrgent' in data:
            data['is_urgent'] = bool(data.get('isUrgent'))
        elif 'is_urgent' in data:
            data['is_urgent'] = bool(data.get('is_urgent'))
            
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
                assigned_to_user = User.objects.filter(id=assignees[0]).first() or request.user
            except:
                pass
        elif 'assigned_to' in data and data['assigned_to'] and data['assigned_to'] != "null":
            try:
                from django.contrib.auth.models import User
                assigned_to_user = User.objects.filter(id=data['assigned_to']).first() or request.user
            except:
                pass

        from core.concurrency import robust_db_write

        def _resolve_and_create():
            nonlocal org, data, assigned_to_user, assignees
            project_id = data.get('project_id') or data.get('project')
            project = None
            if project_id and str(project_id).isdigit():
                project = Project.objects.filter(id=int(project_id)).first()
                if not project:
                    project = Project._base_manager.filter(id=int(project_id)).first()
            elif project_id and isinstance(project_id, str) and str(project_id).strip():
                clean_proj = str(project_id).strip()
                if org:
                    project = Project.objects.filter(name__iexact=clean_proj, organization=org).first()
                if not project:
                    project = Project.objects.filter(name__iexact=clean_proj).first()
                if not project:
                    project = Project.objects.create(
                        name=clean_proj,
                        organization=org,
                        created_by=request.user,
                        department='General'
                    )
            
            if not project:
                if org:
                    project = Project.objects.filter(name__iexact="General Workspace", organization=org).first()
                if not project:
                    project = Project.objects.filter(name__iexact="General Workspace").first()
                if not project:
                    project = Project.objects.create(
                        name="General Workspace",
                        organization=org,
                        created_by=request.user,
                        department='General'
                    )

            if not org and project and getattr(project, 'organization', None):
                org = project.organization
                
            data['project_id'] = project.id
            data.pop('project', None)
            if assigned_to_user:
                data['assigned_to'] = assigned_to_user.id
            elif 'assigned_to' in data:
                data['assigned_to'] = None

            return self._execute_task_create(request, data, project, assigned_to_user, org, assignees)

        task = robust_db_write(_resolve_and_create)

        headers = self.get_success_headers(self.get_serializer(task).data)
        
        # Notify workspace about the new task
        self._notify_workspace(org, 'tasks_updated', {'action': 'create', 'task_id': task.id})
        
        return Response(self.get_serializer(task).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        requested_status = data.get('status')
        
        # Map frontend camelCase to backend snake_case for updates
        if data.get('dueDate'):
            data['due_date'] = data.get('dueDate')
        if 'dueTime' in data or 'due_time' in data:
            from .serializers import parse_flexible_time
            raw_time = data.get('due_time') if 'due_time' in data else data.get('dueTime')
            data['due_time'] = parse_flexible_time(raw_time)
        data.pop('dueTime', None)
        if data.get('estimatedEffort') is not None:
            data['estimated_effort'] = data.get('estimatedEffort')
        if data.get('effortUnit'):
            data['effort_unit'] = data.get('effortUnit')
            
        if 'isUrgent' in data:
            data['is_urgent'] = bool(data.get('isUrgent'))
        elif 'is_urgent' in data:
            data['is_urgent'] = bool(data.get('is_urgent'))
            
        # Clean project_id if invalid string or project name passed
        project_val = data.get('project_id') if 'project_id' in data else data.get('project')
        if project_val is not None:
            if str(project_val).isdigit():
                data['project_id'] = int(project_val)
            elif isinstance(project_val, str) and project_val.strip() not in ["", "null", "undefined"]:
                proj = Project.objects.filter(name__iexact=str(project_val).strip()).first()
                if not proj:
                    proj = Project._base_manager.filter(name__iexact=str(project_val).strip()).first()
                data['project_id'] = proj.id if proj else getattr(instance.project, 'id', None)
            else:
                data['project_id'] = getattr(instance.project, 'id', None)
        elif 'project_id' in data:
            data['project_id'] = getattr(instance.project, 'id', None)
        data.pop('project', None)

        assignees = data.get('assigneeIds', [])
        if isinstance(assignees, str):
            import json
            try:
                assignees = json.loads(assignees)
            except:
                assignees = []
                
        if data.get('taskType') == 'self':
            if not instance.assigned_to:
                instance.assigned_to = request.user
            data['assigned_to'] = instance.assigned_to.id
        elif data.get('taskType') == 'assign' and assignees and len(assignees) > 0:
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
        from core.concurrency import robust_db_write
        robust_db_write(lambda: self.perform_update(serializer))

        # Save multi-assignees if passed
        if 'assigneeIds' in data and data.get('taskType') != 'self':
            if assignees and len(assignees) > 0:
                try:
                    from django.contrib.auth.models import User
                    users = User.objects.filter(id__in=assignees)
                    instance.assignees.set(users)
                except Exception:
                    pass
            else:
                instance.assignees.clear()
        elif data.get('taskType') == 'self':
            assigned_user = instance.assigned_to or request.user
            instance.assignees.set([assigned_user])

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

        if request.user.is_authenticated:
            try:
                from workspace.models import TeamActivity
                act = 'completed task' if instance.status in ['done', 'completed'] else 'updated task'
                TeamActivity.objects.create(
                    user=request.user,
                    action=act,
                    target=instance.title
                )
            except Exception:
                pass

        serializer_data = self.get_serializer(instance).data
        if (
            getattr(instance, 'is_queued', False)
            and getattr(instance, 'status', None) == 'pending'
            and requested_status in ['in_progress', 'in-progress']
        ):
            serializer_data['queued'] = True
            serializer_data['queue_detail'] = "Active task limit reached; task has been queued."
        else:
            serializer_data['queued'] = False
            serializer_data['queue_detail'] = None

        return Response(serializer_data)

    def destroy(self, request, *args, **kwargs):
        from core.concurrency import robust_db_write
        instance = self.get_object()
        org = instance.organization
        task_id = instance.id
        
        response = robust_db_write(lambda: super(TaskViewSet, self).destroy(request, *args, **kwargs))
        
        self._notify_workspace(org, 'tasks_updated', {'action': 'delete', 'task_id': task_id})
        return response

    @action(detail=False, methods=['get'], url_path='csv_template')
    def csv_template(self, request):
        from django.http import HttpResponse
        import csv

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="task_bulk_upload_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Task Topic',
            'Description',
            'Priority',
            'Due Date',
            'Due Time',
            'Project',
            'Assigned To',
            'Type',
            'Platform',
            'Estimated Effort',
            'Effort Unit',
            'Is Urgent',
            'Tags'
        ])
        
        org = self.get_organization()
        user_projects = list(Project.objects.filter(organization=org).exclude(name__iexact="General Workspace").values_list('name', flat=True)[:5])
        
        proj_1 = user_projects[0] if len(user_projects) > 0 else "Mobile App Development"
        proj_2 = user_projects[1] if len(user_projects) > 1 else "Website Redesign"
        proj_3 = user_projects[2] if len(user_projects) > 2 else "General Workspace"

        current_user = request.user.username if request.user.is_authenticated else 'admin'
        today_str = timezone.now().date().isoformat()
        future_date_1 = (timezone.now().date() + timezone.timedelta(days=2)).isoformat()
        future_date_2 = (timezone.now().date() + timezone.timedelta(days=5)).isoformat()

        writer.writerow([
            'Implement User Authentication API',
            'Setup JWT login endpoints, refresh tokens and RBAC middleware',
            'P1',
            today_str,
            '17:00',
            proj_1,
            current_user,
            'Feature',
            'Backend',
            '6',
            'hours',
            'TRUE',
            'auth, security, api'
        ])
        writer.writerow([
            'Design Dashboard UI Layout',
            'Create responsive statistics widgets, navigation drawer and activity charts',
            'P2',
            future_date_1,
            '18:30',
            proj_2,
            '',
            'Enhancement',
            'Web',
            '8',
            'hours',
            'FALSE',
            'ui, design, frontend'
        ])
        writer.writerow([
            'Database Query Optimization',
            'Analyze slow queries and create database indices on tasks and projects',
            'P3',
            future_date_2,
            '14:00',
            proj_3,
            '',
            'Issue',
            'Database',
            '4',
            'hours',
            'FALSE',
            'database, performance'
        ])
        return response

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser], url_path='bulk_upload')
    def bulk_upload(self, request):
        import csv
        import json
        from django.utils import timezone
        from django.contrib.auth.models import User
        from .models import Task, Project
        from .serializers import parse_flexible_time

        org = self.get_organization()
        user = request.user

        is_dict_data = isinstance(request.data, dict)
        default_project_id = request.data.get('default_project_id') if is_dict_data else None
        default_assigned_to_id = request.data.get('default_assigned_to_id') if is_dict_data else None
        default_priority = (request.data.get('default_priority') if is_dict_data else None) or 'P3'

        rows_to_process = []
        uploaded_file = request.FILES.get('file')

        if uploaded_file:
            try:
                raw_bytes = uploaded_file.read()
                try:
                    decoded_file = raw_bytes.decode('utf-8-sig').splitlines()
                except UnicodeDecodeError:
                    decoded_file = raw_bytes.decode('latin-1').splitlines()

                reader = csv.DictReader(decoded_file)
                for raw_row in reader:
                    if any(str(val).strip() for val in raw_row.values() if val is not None):
                        rows_to_process.append(raw_row)
            except Exception as e:
                return Response({'error': f"Failed to parse CSV file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        elif is_dict_data and 'tasks' in request.data:
            tasks_data = request.data.get('tasks')
            if isinstance(tasks_data, str):
                try:
                    tasks_data = json.loads(tasks_data)
                except Exception:
                    tasks_data = []
            if isinstance(tasks_data, list):
                rows_to_process = tasks_data
        elif isinstance(request.data, list):
            rows_to_process = request.data

        if not rows_to_process:
            return Response({'error': 'No tasks found to upload. Please supply a valid CSV file or task list.'}, status=status.HTTP_400_BAD_REQUEST)

        projects_by_name = {p.name.lower().strip(): p for p in Project.objects.filter(organization=org)}
        projects_by_id = {str(p.id): p for p in Project.objects.filter(organization=org)}

        users_by_username = {}
        users_by_email = {}
        users_by_id = {}
        for u in User.objects.all():
            users_by_username[u.username.lower().strip()] = u
            if u.email:
                users_by_email[u.email.lower().strip()] = u
            users_by_id[str(u.id)] = u

        fallback_project = None
        if default_project_id and str(default_project_id) in projects_by_id:
            fallback_project = projects_by_id[str(default_project_id)]
        if not fallback_project:
            fallback_project, _ = Project.objects.get_or_create(
                name="General Workspace",
                organization=org,
                defaults={'created_by': user, 'department': 'General'}
            )
            projects_by_name[fallback_project.name.lower().strip()] = fallback_project
            projects_by_id[str(fallback_project.id)] = fallback_project

        fallback_assignee = None
        if default_assigned_to_id and str(default_assigned_to_id) in users_by_id:
            fallback_assignee = users_by_id[str(default_assigned_to_id)]

        created_tasks = []
        logs = []
        errors = []

        for idx, row in enumerate(rows_to_process, start=1):
            now = timezone.now()
            timestamp_now = now.isoformat()
            time_display = now.strftime('%I:%M:%S %p')

            norm = {}
            for k, v in row.items():
                if k is not None:
                    cleaned_k = str(k).strip().lower().replace(' ', '_').replace('-', '_')
                    norm[cleaned_k] = v.strip() if isinstance(v, str) else v

            title = (
                norm.get('task_topic') or
                norm.get('topic') or
                norm.get('title') or
                norm.get('task_title') or
                norm.get('name') or
                norm.get('task_name')
            )
            if not title or not str(title).strip():
                err_msg = f"Row #{idx}: Missing task title/topic."
                errors.append(err_msg)
                logs.append({
                    'timestamp': timestamp_now,
                    'time_display': time_display,
                    'status': 'error',
                    'row_index': idx,
                    'title': 'Untitled',
                    'message': err_msg
                })
                continue
            title = str(title).strip()

            description = norm.get('description') or norm.get('details') or ''

            raw_priority = str(norm.get('priority') or default_priority or 'P3').strip().upper()
            if 'P1' in raw_priority or 'CRITICAL' in raw_priority:
                priority = 'P1'
            elif 'P2' in raw_priority or 'HIGH' in raw_priority:
                priority = 'P2'
            elif 'P4' in raw_priority or 'LOW' in raw_priority:
                priority = 'P4'
            else:
                priority = 'P3'

            # Robust due date extraction across variations
            raw_due_date = norm.get('due_date') or norm.get('duedate') or norm.get('due') or norm.get('date') or norm.get('deadline') or norm.get('task_due_date') or norm.get('target_date')
            if not raw_due_date:
                for k, v in norm.items():
                    if v and ('due' in k or 'deadline' in k or 'target' in k):
                        raw_due_date = v
                        break

            due_date = None
            if raw_due_date:
                raw_due_date_str = str(raw_due_date).strip().split('T')[0].split(' ')[0]
                # Excel serial date support (e.g. 45582)
                if raw_due_date_str.isdigit() and len(raw_due_date_str) in (4, 5):
                    try:
                        from datetime import date as py_date, timedelta as py_timedelta
                        due_date = py_date(1899, 12, 30) + py_timedelta(days=int(raw_due_date_str))
                    except Exception:
                        pass
                if not due_date:
                    date_formats = (
                        '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d',
                        '%d.%m.%Y', '%m-%d-%Y', '%d-%b-%Y', '%d-%B-%Y', '%b-%d-%Y',
                        '%d/%m/%y', '%d-%m-%y', '%m/%d/%y', '%y-%m-%d', '%d %b %Y',
                        '%d %B %Y', '%b %d, %Y', '%B %d, %Y'
                    )
                    for fmt in date_formats:
                        try:
                            due_date = timezone.datetime.strptime(raw_due_date_str, fmt).date()
                            break
                        except ValueError:
                            pass
            if not due_date:
                due_date = timezone.now().date()

            raw_due_time = norm.get('due_time') or norm.get('duetime') or norm.get('time')
            due_time = parse_flexible_time(raw_due_time) if raw_due_time else None

            raw_project = norm.get('project') or norm.get('project_id') or norm.get('project_name')
            assigned_project = None
            if raw_project:
                proj_str = str(raw_project).strip()
                if proj_str in projects_by_id:
                    assigned_project = projects_by_id[proj_str]
                elif proj_str.lower() in projects_by_name:
                    assigned_project = projects_by_name[proj_str.lower()]
                else:
                    found_proj = Project.objects.filter(organization=org, name__iexact=proj_str).first()
                    if found_proj:
                        assigned_project = found_proj
                        projects_by_name[proj_str.lower()] = found_proj
                    else:
                        # User specified a project that does not exist yet; auto-create so task attaches to this exact project
                        new_proj = Project.objects.create(
                            name=proj_str,
                            organization=org,
                            created_by=user,
                            department='General'
                        )
                        assigned_project = new_proj
                        projects_by_name[proj_str.lower()] = new_proj
                        projects_by_id[str(new_proj.id)] = new_proj
            if not assigned_project:
                assigned_project = fallback_project

            raw_assignee = norm.get('assigned_to') or norm.get('assignee') or norm.get('assigned')
            assigned_user = None
            if raw_assignee:
                assignee_str = str(raw_assignee).strip()
                if assignee_str in users_by_id:
                    assigned_user = users_by_id[assignee_str]
                elif assignee_str.lower() in users_by_username:
                    assigned_user = users_by_username[assignee_str.lower()]
                elif assignee_str.lower() in users_by_email:
                    assigned_user = users_by_email[assignee_str.lower()]
                else:
                    found_user = User.objects.filter(username__iexact=assignee_str).first() or User.objects.filter(email__iexact=assignee_str).first()
                    if found_user:
                        assigned_user = found_user
            if not assigned_user:
                assigned_user = fallback_assignee or user

            task_type = norm.get('type') or ''
            platform = norm.get('platform') or ''

            raw_effort = norm.get('estimated_effort') or norm.get('effort') or norm.get('estimated_hours') or 3
            try:
                estimated_effort = int(float(str(raw_effort).strip()))
            except (ValueError, TypeError):
                estimated_effort = 3
            effort_unit = norm.get('effort_unit') or 'hours'

            raw_urgent = str(norm.get('is_urgent') or norm.get('urgent') or 'false').lower()
            is_urgent = raw_urgent in ['true', 'yes', '1', 't', 'y']

            try:
                task = Task.objects.create(
                    title=title,
                    description=description,
                    priority=priority,
                    due_date=due_date,
                    due_time=due_time,
                    project=assigned_project,
                    assigned_to=assigned_user,
                    type=task_type,
                    platform=platform,
                    estimated_effort=estimated_effort,
                    effort_unit=effort_unit,
                    is_urgent=is_urgent,
                    status='pending',
                    created_by=user,
                    organization=org
                )
                if assigned_user:
                    task.assignees.add(assigned_user)

                created_tasks.append(self.get_serializer(task).data)

                assignee_label = assigned_user.get_full_name() or assigned_user.username if assigned_user else 'Unassigned'
                proj_label = assigned_project.name if assigned_project else 'General Workspace'

                logs.append({
                    'timestamp': timestamp_now,
                    'time_display': time_display,
                    'status': 'success',
                    'row_index': idx,
                    'task_id': task.id,
                    'title': task.title,
                    'priority': task.priority,
                    'project': proj_label,
                    'assigned_to': assignee_label,
                    'due_date': str(task.due_date),
                    'message': f"[{time_display}] Created task #{task.id}: \"{task.title}\" | {task.priority} | Project: {proj_label} | Assigned: {assignee_label}"
                })

            except Exception as e:
                err_text = f"Row #{idx} (\"{title}\"): Error creating task - {str(e)}"
                errors.append(err_text)
                logs.append({
                    'timestamp': timestamp_now,
                    'time_display': time_display,
                    'status': 'error',
                    'row_index': idx,
                    'title': title,
                    'message': err_text
                })

        if created_tasks:
            self._notify_workspace(org, 'tasks_updated', {
                'action': 'bulk_upload',
                'count': len(created_tasks),
                'created_by': user.username
            })

        return Response({
            'success': True,
            'total_rows': len(rows_to_process),
            'created_count': len(created_tasks),
            'failed_count': len(errors),
            'created_tasks': created_tasks,
            'logs': logs,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_tasks else status.HTTP_400_BAD_REQUEST)


import openpyxl
from django.http import HttpResponse

from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_projects_excel(request):
    project_ids_str = request.GET.get('ids', '')
    if not project_ids_str:
        return Response({'error': 'No project IDs provided'}, status=400)
    
    project_ids = [pid.strip() for pid in project_ids_str.split(',') if pid.strip().isdigit()]
    
    projects = Project.objects.filter(id__in=project_ids)
    
    workbook = openpyxl.Workbook()
    
    projects_sheet = workbook.active
    projects_sheet.title = "Projects and Tasks"
    projects_sheet.append(["Project ID", "Project Name", "Project Status", "Task Title", "Priority", "Task Status", "Assignee", "Task Due Date"])
    
    from .models import Task as ApiTask
    for p in projects:
        # Use all_objects to bypass ANY tenant filtering that might hide tasks
        tasks = ApiTask.all_objects.filter(project=p)
        if tasks.exists():
            for t in tasks:
                assignee_name = t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else "Unassigned"
                projects_sheet.append([
                    p.id,
                    p.name,
                    p.status,
                    t.title,
                    t.priority,
                    t.status,
                    assignee_name,
                    str(t.due_date) if t.due_date else "N/A"
                ])
        else:
            # If the project has no tasks, still show the project
            projects_sheet.append([
                p.id,
                p.name,
                p.status,
                "No tasks",
                "-",
                "-",
                "-",
                "-"
            ])
        
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="exported_projects.xlsx"'
    workbook.save(response)
    return response