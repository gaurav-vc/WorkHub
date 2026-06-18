from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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
            "attendees": m.attendees.count() + 1, # + organizer
            "internal_attendees": [{"id": a.id, "name": a.get_full_name() or a.username} for a in m.attendees.all()],
            "external_attendees": m.external_attendees,
            "is_task": False
        })
        
    # Fetch tasks assigned to or created by user
    tasks = Task.objects.filter(Q(assigned_to=request.user) | Q(created_by=request.user)).distinct()
    for t in tasks:
        # Convert date to datetime for unified representation
        due_dt = datetime.datetime.combine(t.due_date, datetime.time(9, 0))
        if timezone.is_naive(due_dt):
            try:
                due_dt = timezone.make_aware(due_dt)
            except Exception:
                pass
                
        data.append({
            "id": f"task_{t.id}",
            "title": f"📋 [Task] {t.title}",
            "meeting_time": due_dt.isoformat(),
            "duration": "1 hour",
            "meeting_type": "task",
            "description": t.description,
            "is_task": True,
            "task_id": t.id,
            "status": t.status,
            "priority": t.priority,
            "assigned_to": t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else "Unassigned",
        })
        
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
            
        task = Task.objects.create(
            title=title,
            description=description,
            priority=priority,
            status=status,
            project=project,
            assigned_to=assigned_to or request.user,
            created_by=request.user,
            due_date=due_date
        )
        
        return Response({
            "message": "Task created successfully",
            "task_id": task.id
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def event_create(request):
    try:
        title = request.data.get('title')
        start_time = request.data.get('start_time')
        duration = request.data.get('duration', '30 mins')
        meeting_type = request.data.get('meeting_type', 'internal')
        description = request.data.get('description', '')
        meeting_link = request.data.get('meeting_link', '')

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
    users = User.objects.all().select_related('auth_profile')
    user_list = []
    
    for u in users:
        role = u.auth_profile.role if hasattr(u, 'auth_profile') else 'EMP'
        user_list.append({
            "id": u.id,
            "username": u.username,
            "name": u.get_full_name() or u.username,
            "role": role
        })
        
    return Response(user_list)
