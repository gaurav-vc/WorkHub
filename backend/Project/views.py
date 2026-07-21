from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Project
from .serializers import ProjectSerializer
from core.utils import get_visible_users

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
            
        projects = Project.objects.filter(q).exclude(name__iexact="General Workspace").distinct().order_by('-created_at')
        serializer = ProjectSerializer(projects, many=True)
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
        project = Project.objects.filter(q, id=project_id).distinct().first()
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

def recalculate_project_progress(project):
    total_tasks = project.api_tasks.count()
    if total_tasks == 0:
        project.progress = 0
    else:
        done_tasks = project.api_tasks.filter(status__in=['done', 'completed']).count()
        project.progress = int((done_tasks / total_tasks) * 100)
    project.save(update_fields=['progress'])
    return project.progress

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
            status='pending'
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
    from .serializers import TaskSerializer
    serializer_class = TaskSerializer
    from role_base_access.permissions import RBACPermission
    permission_classes = [IsAuthenticated, RBACPermission]
    rbac_module = 'tasks-projects'

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
        
        # Site admins, super users, and roles with cross-department access see all tasks
        global_access = False
        if user.is_superuser:
            global_access = True
            
        profile = getattr(user, 'auth_profile', None)
        if profile:
            if profile.user_type in ['super_user', 'site_admin']:
                global_access = True
            elif profile.role_relationship:
                from role_base_access.models import Role as RBACRole
                rbac_role = RBACRole.objects.filter(name=profile.role_relationship.name).first()
                if rbac_role and getattr(rbac_role, 'cross_department_access', False):
                    global_access = True
                    
        if global_access:
            return queryset.order_by('-created_at')
            
        from django.db.models import Q
        return queryset.filter(Q(assigned_to=user) | Q(created_by=user)).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        super().perform_create(serializer, created_by=self.request.user)

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

        project_id = data.get('project_id')
        project = None
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
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
        return Response(self.get_serializer(task).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Map frontend camelCase to backend snake_case for updates
        if data.get('dueDate'):
            data['due_date'] = data.get('dueDate')
        if data.get('dueTime'):
            data['due_time'] = data.get('dueTime')
            
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
            
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

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

        return Response(self.get_serializer(instance).data)