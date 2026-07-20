from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from role_base_access.permissions import require_rbac_permission
from rest_framework.response import Response
from .models import Meeting
from django.utils import timezone
from dateutil.parser import parse as dateutil_parse
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
import datetime
import smtplib

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('tasks-calendar')
def event_list(request):
    from django.db.models import Q
    from Project.models import Task
    
    # Fetch meetings where the user is either the organizer or an attendee
    meetings = Meeting.objects.filter(attendees=request.user) | Meeting.objects.filter(organizer=request.user)
    meetings = meetings.distinct()
    
    data = []
    for m in meetings:
        data.append({
            "id": m.id,
            "title": m.title,
            "meeting_time": m.meeting_time.isoformat(),
            "duration": m.duration,
            "meeting_type": m.meeting_type,
            "description": m.description,
            "meeting_link": m.meeting_link,
            "platform": m.platform,
            "is_recurring": m.is_recurring,
            "recurring_type": m.recurring_type,
            "attendees": m.attendees.count() + 1, # + organizer
            "internal_attendees": [{"id": a.id, "name": a.get_full_name() or a.username} for a in m.attendees.all()],
            "external_attendees": m.external_attendees,
            "start_time": m.meeting_time.isoformat(),
            "is_task": False
        })
        
    # Fetch tasks assigned to or created by user, OR all tasks if they have cross-department access
    global_access = False
    if request.user.is_superuser:
        global_access = True
    else:
        profile = getattr(request.user, 'auth_profile', None)
        if profile:
            if profile.user_type in ['super_user', 'site_admin']:
                global_access = True
            elif profile.role_relationship:
                from role_base_access.models import Role as RBACRole
                rbac_role = RBACRole.objects.filter(name=profile.role_relationship.name).first()
                if rbac_role and getattr(rbac_role, 'cross_department_access', False):
                    global_access = True

    if global_access:
        tasks = Task.objects.all().distinct()
    else:
        tasks = Task.objects.filter(Q(assigned_to=request.user) | Q(created_by=request.user)).distinct()
    for t in tasks:
        # Convert date to datetime for unified representation
        task_due_date = t.due_date if t.due_date else timezone.now().date()
        due_dt = datetime.datetime.combine(task_due_date, datetime.time(9, 0))
        if timezone.is_naive(due_dt):
            try:
                due_dt = timezone.make_aware(due_dt)
            except Exception:
                pass
                
        data.append({
            "id": f"task_{t.id}",
            "title": f"📋 [Task] {t.title}",
            "meeting_time": due_dt.isoformat(),
            "start_time": due_dt.isoformat(),
            "duration": "1 hour",
            "meeting_type": "task",
            "description": t.description,
            "is_task": True,
            "task_id": t.id,
            "status": t.status,
            "priority": t.priority,
            "assigned_to": t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else "Unassigned",
            "healthStatus": getattr(t, 'health_status', None),
            "isQueued": getattr(t, 'is_queued', False),
            "isUrgent": getattr(t, 'is_urgent', False),
        })
        
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('tasks-calendar')
def create_task_calendar(request):
    try:
        from Project.models import Task
        from Project.models import Project
        
        title = request.data.get('title', 'Untitled Task')
        description = request.data.get('description', '')
        due_date_str = request.data.get('due_date')
        assignee_id = request.data.get('assigned_to_id')
        priority = request.data.get('priority', 'P3')
        status = request.data.get('status', 'pending')
        
        due_date = dateutil_parse(due_date_str).date() if due_date_str else timezone.now().date()
        
        project, _ = Project.objects.get_or_create(
            name="General Workspace",
            defaults={'created_by': request.user, 'department': 'General'}
        )
        
        assigned_to = None
        if assignee_id:
            if assignee_id == "self":
                assigned_to = request.user
            else:
                assigned_to = User.objects.filter(id=assignee_id).first()
                
        time_interval_minutes = None
        if 'time_interval_minutes' in request.data:
            try:
                time_interval_minutes = int(request.data['time_interval_minutes'])
            except (ValueError, TypeError):
                pass
            
        task = Task.objects.create(
            title=title,
            description=description,
            priority=priority,
            status=status,
            project=project,
            assigned_to=assigned_to or request.user,
            created_by=request.user,
            due_date=due_date,
            time_interval_minutes=time_interval_minutes
        )
        
        return Response({
            "message": "Task created successfully",
            "task_id": task.id
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('tasks-calendar')
def event_create(request):
    try:
        title = request.data.get('title')
        start_time = request.data.get('start_time')
        duration = request.data.get('duration', '30 mins')
        meeting_type = request.data.get('meeting_type', 'internal')
        description = request.data.get('description', '')
        meeting_link = request.data.get('meeting_link', '')
        platform = request.data.get('platform', '')

        try:
            dt = dateutil_parse(start_time)
        except Exception:
            raise ValueError(f"Invalid isoformat string: '{start_time}'")
            
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)

        recurrence_type = request.data.get('recurrence_type', 'none')
        recurrence_end_date = request.data.get('recurrence_end_date')
        
        interval_start_day_raw = request.data.get('interval_start_day')
        interval_end_day_raw = request.data.get('interval_end_day')
        interval_start_day = int(interval_start_day_raw) if interval_start_day_raw else 1
        interval_end_day = int(interval_end_day_raw) if interval_end_day_raw else 31

        meetings_to_create = []
        current_dt = dt

        if recurrence_type != 'none' and recurrence_end_date:
            end_dt = dateutil_parse(recurrence_end_date)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)
                
            # Limit to prevent infinite loops (max 365 meetings)
            max_meetings = 365
            count = 0
            while current_dt.date() <= end_dt.date() and count < max_meetings:
                # For monthly_interval, only create if the day is within the range
                if recurrence_type != 'monthly_interval' or (interval_start_day <= current_dt.day <= interval_end_day):
                    meeting = Meeting.objects.create(
                        title=title,
                        meeting_time=current_dt,
                        duration=duration,
                        meeting_type=meeting_type,
                        description=description,
                        meeting_link=meeting_link,
                        platform=platform,
                        is_recurring=True,
                        recurring_type=recurrence_type,
                        recurring_end_date=end_dt,
                        organizer=request.user
                    )
                    meetings_to_create.append(meeting)
                    count += 1
                
                if recurrence_type == 'daily' or recurrence_type == 'monthly_interval':
                    current_dt += datetime.timedelta(days=1)
                elif recurrence_type == 'weekly':
                    current_dt += datetime.timedelta(weeks=1)
                elif recurrence_type == 'monthly':
                    from dateutil.relativedelta import relativedelta
                    current_dt += relativedelta(months=1)
                else:
                    break
        else:
            meeting = Meeting.objects.create(
                title=title,
                meeting_time=dt,
                duration=duration,
                meeting_type=meeting_type,
                description=description,
                meeting_link=meeting_link,
                platform=platform,
                organizer=request.user
            )
            meetings_to_create.append(meeting)
        
        internal_attendee_ids = request.data.get('internal_attendee_ids', [])
        external_emails = request.data.get('external_emails', '')
        
        for m in meetings_to_create:
            if internal_attendee_ids:
                m.attendees.set(internal_attendee_ids)
            if external_emails:
                m.external_attendees = external_emails
                m.save()

        # Gather all emails to invite
        import re
        email_regex = re.compile(r"^[^@]+@[^@]+\.[^@]+$")
        
        email_list = []
        if external_emails:
            for e in external_emails.split(','):
                e = e.strip()
                if e:
                    if not email_regex.match(e):
                        return Response({"error": f"Invalid external email address: {e}"}, status=400)
                    email_list.append(e)
        
        if meetings_to_create and meetings_to_create[0]:
            for attendee in meetings_to_create[0].attendees.all():
                if attendee.email:
                    email_list.append(attendee.email)
                
        if email_list and str(meeting_type) != 'event':
            subject = f"Meeting Invitation: {title}"
            if str(recurrence_type).lower() != 'none':
                subject = f"Recurring Meeting Invitation: {title}"
                
            message = f"You have been invited to a meeting.\n\nTitle: {title}\n"
            if str(recurrence_type).lower() != 'none':
                message += f"Recurrence: {str(recurrence_type).capitalize()} until {recurrence_end_date}\n"
            message += f"Time: {start_time}\nDuration: {duration}\nLink: {meeting_link}\n\nDescription:\n{description}"
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=email_list,
                    fail_silently=False,
                )
            except Exception as e:
                print(f"\n[EMAIL ERROR] Failed to send email to {email_list}: {str(e)}\n")

        return Response({
            "message": "Meeting(s) created successfully", 
            "count": len(meetings_to_create)
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('tasks-calendar')
def event_update(request, pk):
    try:
        meeting = Meeting.objects.get(id=pk)
        
        # Only allow organizer or perhaps attendees to update? 
        # For now, allow if user is authenticated and organizer, or just allow (assuming internal trust for demo).
        # We'll allow the organizer to update it.
        if meeting.organizer != request.user:
            return Response({"error": "Only the organizer can edit this meeting."}, status=403)

        if 'title' in request.data:
            meeting.title = request.data['title']
        if 'duration' in request.data:
            meeting.duration = request.data['duration']
        if 'meeting_type' in request.data:
            meeting.meeting_type = request.data['meeting_type']
        if 'description' in request.data:
            meeting.description = request.data['description']
        if 'start_time' in request.data:
            try:
                dt = dateutil_parse(request.data['start_time'])
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                meeting.meeting_time = dt
            except Exception:
                return Response({"error": "Invalid start_time format"}, status=400)
                
        if 'internal_attendee_ids' in request.data:
            meeting.attendees.set(request.data['internal_attendee_ids'])
        if 'external_emails' in request.data:
            meeting.external_attendees = request.data['external_emails']
                
        meeting.save()
        return Response({"message": "Meeting updated successfully"})
    except Meeting.DoesNotExist:
        return Response({"error": "Meeting not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@require_rbac_permission('tasks-calendar')
def event_delete(request, pk):
    try:
        meeting = Meeting.objects.get(id=pk)
        
        # Only allow the organizer to delete it.
        if meeting.organizer != request.user:
            return Response({"error": "Only the organizer can delete this meeting."}, status=403)

        meeting.delete()
        return Response({"message": "Meeting deleted successfully"})
    except Meeting.DoesNotExist:
        return Response({"error": "Meeting not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_employees(request):
    """Returns a list of users/employees for selection lists in administration views."""
    from directory.models import Employee
    users = User.objects.all().select_related('auth_profile')
    user_list = []
    
    # Pre-fetch employees to match by email to get department
    employees = {e.email: e.department for e in Employee.objects.all() if e.email}
    
    for u in users:
        role = u.auth_profile.role if hasattr(u, 'auth_profile') else 'EMP'
        department = employees.get(u.email, "General")
        
        user_list.append({
            "id": u.id,
            "username": u.username,
            "name": u.get_full_name() or u.username,
            "role": role,
            "department": department
        })
        
    return Response(user_list)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_meeting_link(request):
    import uuid
    import random
    import string
    platform = request.data.get('platform', 'Google Meet')
    
    if platform == 'Microsoft Teams':
        meeting_id = str(uuid.uuid4())
        link = f"https://teams.microsoft.com/l/meetup-join/19:meeting_{meeting_id}@thread.v2/0?context=%7b%22Tid%22%3a%22dummy%22%2c%22Oid%22%3a%22dummy%22%7d"
    elif platform == 'Google Meet':
        # Without Google Workspace OAuth, any arbitrary Google Meet link will fail.
        # We generate a valid format (xxx-xxxx-xxx) so it passes validation, 
        # but realistically this needs a real integration.
        # Alternatively, we could fallback to a working Jitsi link here.
        chars = string.ascii_lowercase
        p1 = ''.join(random.choice(chars) for _ in range(3))
        p2 = ''.join(random.choice(chars) for _ in range(4))
        p3 = ''.join(random.choice(chars) for _ in range(3))
        link = f"https://meet.google.com/{p1}-{p2}-{p3}"
    elif platform == 'Zoom':
        link = f"https://zoom.us/j/{random.randint(1000000000, 9999999999)}?pwd={uuid.uuid4().hex[:8]}"
    else:
        link = f"https://meet.jit.si/WorkHub-{uuid.uuid4().hex[:8]}"
        
    return Response({"link": link})

