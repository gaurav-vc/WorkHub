from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from calendar_meeting.models import Meeting
from Project.models import Task, Project
import datetime

class CalendarMeetingTests(APITestCase):
    def setUp(self):
        # Create users
        self.user = User.objects.create_user(username='testuser', password='password123', email='test@example.com')
        self.other_user = User.objects.create_user(username='otheruser', password='password123', email='other@example.com')
        
        # Authenticate main user
        self.client.force_authenticate(user=self.user)
        
        # Create a project
        self.project = Project.objects.create(
            name="Test Project",
            created_by=self.user,
            department="Testing"
        )
        
    def test_create_task_calendar(self):
        url = '/api/calendar/tasks/create/'
        data = {
            'title': 'Test Calendar Task',
            'description': 'Description of the calendar task',
            'due_date': '2026-06-05T13:00:00.000Z',
            'assigned_to_id': self.user.id,
            'priority': 'P2',
            'status': 'pending'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('task_id', response.data)
        
        # Verify task is created in DB
        task = Task.objects.get(id=response.data['task_id'])
        self.assertEqual(task.title, 'Test Calendar Task')
        self.assertEqual(task.priority, 'P2')
        self.assertEqual(task.status, 'pending')
        self.assertEqual(task.assigned_to, self.user)
        
    def test_event_list_merges_meetings_and_tasks(self):
        # Create a meeting
        meeting = Meeting.objects.create(
            title="Important Sync",
            description="Sync notes",
            organizer=self.user,
            meeting_time=timezone.now() + datetime.timedelta(days=1),
            duration="30 mins",
            meeting_type="internal"
        )
        meeting.attendees.add(self.other_user)
        
        # Create a task
        task = Task.objects.create(
            title="Important Coding",
            description="Finish feature",
            priority="P1",
            status="pending",
            project=self.project,
            assigned_to=self.user,
            created_by=self.user,
            due_date=timezone.now().date() + datetime.timedelta(days=2)
        )
        
        url = '/api/calendar/events/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # We expect a list containing both the meeting and the task
        events = response.data
        self.assertEqual(len(events), 2)
        
        # Verify meeting details
        meeting_event = next(e for e in events if not e['is_task'])
        self.assertEqual(meeting_event['id'], meeting.id)
        self.assertEqual(meeting_event['title'], "Important Sync")
        self.assertEqual(meeting_event['meeting_type'], "internal")
        
        # Verify task details
        task_event = next(e for e in events if e['is_task'])
        self.assertEqual(task_event['id'], f"task_{task.id}")
        self.assertEqual(task_event['title'], "📋 [Task] Important Coding")
        self.assertEqual(task_event['status'], "pending")
        self.assertEqual(task_event['priority'], "P1")
        
    def test_create_meeting_single(self):
        url = '/api/calendar/events/create/'
        data = {
            'title': 'Standup Meeting',
            'start_time': '2026-06-02T09:30:00.000Z',
            'duration': '30 mins',
            'meeting_type': 'standup',
            'description': 'Daily updates',
            'meeting_link': 'https://meet.google.com/abc-defg-hij',
            'internal_attendee_ids': [self.other_user.id],
            'external_emails': 'client@example.com',
            'recurrence_type': 'none'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['count'], 1)
        
        # Verify DB entry
        meeting = Meeting.objects.get(title='Standup Meeting')
        self.assertEqual(meeting.meeting_type, 'standup')
        self.assertEqual(meeting.organizer, self.user)
        self.assertIn(self.other_user, meeting.attendees.all())
        self.assertEqual(meeting.external_attendees, 'client@example.com')
        
    def test_create_meeting_recurring_daily(self):
        url = '/api/calendar/events/create/'
        data = {
            'title': 'Daily Recurring Review',
            'start_time': '2026-06-02T10:00:00.000Z',
            'duration': '45 mins',
            'meeting_type': 'client',
            'description': 'Daily project check-in',
            'meeting_link': 'https://meet.google.com/xyz-pdq-rst',
            'recurrence_type': 'daily',
            'recurrence_end_date': '2026-06-05T12:00:00.000Z'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Dates: June 2, June 3, June 4, June 5. That should be 4 meetings.
        self.assertEqual(response.data['count'], 4)
        
        meetings = Meeting.objects.filter(title='Daily Recurring Review').order_by('meeting_time')
        self.assertEqual(meetings.count(), 4)
        self.assertEqual(meetings[0].meeting_time.date(), datetime.date(2026, 6, 2))
        self.assertEqual(meetings[1].meeting_time.date(), datetime.date(2026, 6, 3))
        self.assertEqual(meetings[2].meeting_time.date(), datetime.date(2026, 6, 4))
        self.assertEqual(meetings[3].meeting_time.date(), datetime.date(2026, 6, 5))
        
    def test_update_meeting(self):
        meeting = Meeting.objects.create(
            title="Old Title",
            organizer=self.user,
            meeting_time=timezone.now(),
            duration="30 mins",
            meeting_type="internal"
        )
        
        url = f'/api/calendar/events/{meeting.id}/update/'
        data = {
            'title': 'New Title',
            'duration': '1 hour',
            'meeting_type': 'workshop',
            'description': 'Updated details'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        meeting.refresh_from_db()
        self.assertEqual(meeting.title, 'New Title')
        self.assertEqual(meeting.duration, '1 hour')
        self.assertEqual(meeting.meeting_type, 'workshop')
        
    def test_update_meeting_forbidden_for_non_organizer(self):
        meeting = Meeting.objects.create(
            title="Meeting organized by other user",
            organizer=self.other_user,
            meeting_time=timezone.now(),
            duration="30 mins",
            meeting_type="internal"
        )
        
        url = f'/api/calendar/events/{meeting.id}/update/'
        data = {
            'title': 'Hack Title'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_delete_meeting(self):
        meeting = Meeting.objects.create(
            title="To Delete",
            organizer=self.user,
            meeting_time=timezone.now(),
            duration="30 mins",
            meeting_type="internal"
        )
        
        url = f'/api/calendar/events/{meeting.id}/delete/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Meeting.objects.filter(id=meeting.id).exists())
        
    def test_delete_meeting_forbidden_for_non_organizer(self):
        meeting = Meeting.objects.create(
            title="Don't Delete",
            organizer=self.other_user,
            meeting_time=timezone.now(),
            duration="30 mins",
            meeting_type="internal"
        )
        
        url = f'/api/calendar/events/{meeting.id}/delete/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Meeting.objects.filter(id=meeting.id).exists())
