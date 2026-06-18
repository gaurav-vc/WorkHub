from django.core.management.base import BaseCommand
from django.utils import timezone
from calendar_meeting.models import Meeting
from django.core.mail import send_mail
from django.conf import settings
import datetime
import smtplib

class Command(BaseCommand):
    help = 'Sends reminder emails for meetings happening today'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        meetings = Meeting.objects.filter(meeting_time__date=today)

        if not meetings.exists():
            self.stdout.write(self.style.SUCCESS("No meetings scheduled for today."))
            return

        sent_count = 0
        for meeting in meetings:
            email_list = []
            
            # 1. Organizer
            if meeting.organizer and meeting.organizer.email:
                email_list.append(meeting.organizer.email)
                
            # 2. Internal Attendees
            for attendee in meeting.attendees.all():
                if attendee.email:
                    email_list.append(attendee.email)
                    
            # 3. External Attendees
            if meeting.external_attendees:
                external = [e.strip() for e in meeting.external_attendees.split(',') if e.strip()]
                email_list.extend(external)
                
            # Deduplicate emails
            email_list = list(set(email_list))
            
            if email_list:
                subject = f"Reminder: Meeting '{meeting.title}' is today!"
                message = (
                    f"This is an automated reminder that you have a meeting scheduled for today.\n\n"
                    f"Title: {meeting.title}\n"
                    f"Time: {meeting.meeting_time.strftime('%I:%M %p')}\n"
                    f"Duration: {meeting.duration}\n"
                    f"Link: {meeting.meeting_link or 'N/A'}\n\n"
                    f"Description:\n{meeting.description or 'No description provided.'}\n"
                )
                
                try:
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=email_list,
                        fail_silently=False,
                    )
                    sent_count += len(email_list)
                    self.stdout.write(self.style.SUCCESS(f"Sent reminder for '{meeting.title}' to {len(email_list)} attendees."))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to send reminder for '{meeting.title}': {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Finished sending meeting reminders. Total emails sent: {sent_count}"))
