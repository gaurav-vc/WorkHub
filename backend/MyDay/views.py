from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q

from role_base_access.permissions import require_rbac_permission

from authentication.models import UserProfile
from Project.models import Project
from calendar_meeting.models import Meeting
from workspace.models import TeamActivity, QuickLink
from hr_requests.models import Approval

from authentication.serializers import UserProfileSerializer
from Project.serializers import TaskSerializer
from calendar_meeting.serializers import MeetingSerializer
from workspace.serializers import TeamActivitySerializer, QuickLinkSerializer
from hr_requests.serializers import ApprovalSerializer
from directory.models import Employee
from knowledge_base.models import Article
from boards.models import Board, Column, Card
from hr_requests.models import HRRequest
from core.utils import get_visible_users

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    user = request.user

    today = timezone.now().date()

    try:
        profile_data = UserProfileSerializer(user.auth_profile).data
    except Exception:
        profile_data = {
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": "PM",
            "avatar_initials": (user.get_full_name() or user.username)[:2].upper(),
            "leave_balance": 0,
        }

    visible_users = get_visible_users(user)

    cards_qs = Card.objects.filter(assignee=user).select_related('column__board').order_by('-created_at')[:50]
    
    today_tasks_data = []
    for c in cards_qs:
        today_tasks_data.append({
            "id": c.id,
            "title": c.title,
            "priority": c.priority or "P3",
            "status": c.status or "pending",
            "project": c.column.board.title if c.column and c.column.board else "My Board",
            "dueTime": "",
        })

    pending_tasks_count = Card.objects.filter(assignee=user, status__in=['pending', 'in_progress']).count()

    meetings_qs = Meeting.objects.filter(
        Q(attendees=user) | Q(organizer=user) | Q(organizer__in=visible_users),
        meeting_time__date__gte=today
    ).distinct().order_by('meeting_time')[:5]
    
    activity_qs = TeamActivity.objects.filter(user__in=visible_users).select_related('user').order_by('-created_at')[:5]
    
    approvals_qs = Approval.objects.filter(approver=user, status='pending').select_related('requester')
    quick_links_qs = QuickLink.objects.filter(user=user)

    # Sync HR Requests into Dashboard Pending Approvals
    # For a real app, you would check if the user is an Admin/Manager.
    # We will only show requests if the user is the approver, or if they are admin/manager and the request is from visible_users
    if user.is_superuser or user.is_staff:
        hr_requests_qs = HRRequest.objects.filter(status='pending').select_related('user')
    else:
        hr_requests_qs = HRRequest.objects.filter(user__in=visible_users, status='pending').select_related('user')
    hr_approvals_data = []
    for hr in hr_requests_qs:
        requester_name = hr.user.get_full_name() or hr.user.username if hr.user else "Unknown User"
        hr_approvals_data.append({
            "id": f"hr_{hr.id}",
            "type": hr.type,
            "requester": requester_name,
            "detail": hr.detail or hr.title,
            "status": hr.status
        })
        
    combined_approvals = ApprovalSerializer(approvals_qs, many=True).data + hr_approvals_data

    leave_balance = getattr(getattr(user, 'profile', None), 'leave_balance', 0)
    summary = {
        "tasksDue": pending_tasks_count,
        "leaveBalance": leave_balance,
        "unreadMessages": 0,
        "pendingApprovals": len(combined_approvals),
    }

    return Response({
        "currentUser": profile_data,
        "summaryStats": summary,
        "todayTasks": today_tasks_data,
        "upcomingMeetings": MeetingSerializer(meetings_qs, many=True).data,
        "teamActivity": TeamActivitySerializer(activity_qs, many=True).data,
        "pendingApprovals": combined_approvals,
        "quickLinks": QuickLinkSerializer(quick_links_qs, many=True).data,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('/tasks/my-day')
def handle_approval(request, approval_id):
    try:
        approval = Approval.objects.get(id=approval_id)
    except Approval.DoesNotExist:
        return Response({"error": "Approval not found."}, status=404)

    if not request.user.is_superuser and approval.approver != request.user:
        return Response({"error": "You do not have permission to approve this request."}, status=403)

    action = request.data.get('action')
    if action not in ('approve', 'decline'):
        return Response({"error": "action must be 'approve' or 'decline'."}, status=400)

    approval.status = 'approved' if action == 'approve' else 'declined'
    approval.save()

    TeamActivity.objects.create(
        user=approval.approver,
        action=f"{'approved' if action == 'approve' else 'declined'} a {approval.approval_type} request from",
        target=approval.requester.get_full_name() or approval.requester.username,
    )

    return Response({"message": f"Request {approval.status} successfully.", "status": approval.status})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('/tasks/my-day')
def create_task(request):
    user = request.user
        
    try:
        board, _ = Board.objects.get_or_create(
            title="My Board",
            owner=user,
            defaults={'template_type': 'personal'}
        )
        column, _ = Column.objects.get_or_create(
            board=board,
            title="Todo",
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        card = Card.objects.create(
            title=request.data.get('title', 'Untitled Task'),
            priority=request.data.get('priority', 'P3'),
            status=request.data.get('status', 'pending'),
            column=column,
            assignee=user,
            created_by=user,
            due_date=timezone.now().date()
        )
        return Response({"message": "Task created", "task_id": card.id})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('/tasks/my-day')
def toggle_task(request, task_id):
    try:
        card = Card.objects.get(id=task_id)
        new_status = request.data.get('status')
        if new_status:
            card.status = new_status
        else:
            card.status = 'done' if card.status != 'done' else 'pending'
        card.save()
        return Response({"message": "Task status updated", "status": card.status})
    except Card.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)

def get_ai_context_data(user):
    today = timezone.now().date()
    
    # 1. Tasks Context (match dashboard logic)
    cards_qs = Card.objects.filter(assignee=user).select_related('column__board').order_by('-created_at')[:50]
    tasks_data = [{"title": c.title, "priority": c.priority, "status": c.status, "due": str(c.due_date)} for c in cards_qs]
    
    # 2. Calendar / Meetings Context (match dashboard logic)
    visible_users = get_visible_users(user)
    meetings_qs = Meeting.objects.filter(
        Q(attendees=user) | Q(organizer=user) | Q(organizer__in=visible_users),
        meeting_time__date__gte=today
    ).distinct().order_by('meeting_time')[:10]
    meetings_data = [{"title": m.title, "time": str(m.meeting_time), "duration": m.duration, "type": m.meeting_type} for m in meetings_qs]
    
    # 3. HR Context (Leave, Approvals, Directory)
    from hr_requests.models import HRRequest
    try:
        leave_balance = user.auth_profile.leave_balance
        user_role = user.auth_profile.get_role_display()
    except Exception:
        leave_balance = 0
        user_role = "EMP"

    hr_requests_qs = HRRequest.objects.filter(user=user, status='pending')
    hr_requests_data = [{"title": r.title, "type": r.type, "detail": r.detail, "status": r.status} for r in hr_requests_qs]
    
    # We don't have Employee model directly linked to User cleanly here in this snippet, 
    # but we can just list top employees for context (ideally filtered by visible_users)
    employees_qs = Employee.objects.all()[:20]
    employees_data = [{"name": e.name, "role": e.role} for e in employees_qs]
    
    # 4. Leads / Boards Context (e.g. Sales Pipeline)
    cards_qs = Card.objects.filter(assignee__in=visible_users).select_related('column')[:20]
    leads_data = [{"title": c.title, "column": c.column.title} for c in cards_qs]
    
    # 5. Knowledge Base
    articles_qs = Article.objects.all()[:15]
    knowledge_data = [{"title": a.title, "excerpt": a.excerpt} for a in articles_qs]
    
    return {
        "currentUser": {"name": user.get_full_name() or user.username, "role": user_role},
        "tasks": tasks_data,
        "meetings": meetings_data,
        "hr": {
            "leaveBalance": leave_balance,
            "pendingApprovals": hr_requests_data,
            "employees": employees_data
        },
        "leads": leads_data,
        "knowledge": knowledge_data
    }

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_context_view(request):
    data = get_ai_context_data(request.user)
    return Response(data)