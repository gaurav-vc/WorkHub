from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from directory.models import Employee
from recognition.models import Kudos
import datetime

class Command(BaseCommand):
    help = 'Check for birthdays today and automatically send Happy Birthday emails/kudos'

    def handle(self, *args, **kwargs):
        today = datetime.date.today()
        
        # Get employees whose birthday is today
        # Because date_of_birth includes the year, we must match month and day
        employees = Employee.objects.filter(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day
        )
        
        count = 0
        for emp in employees:
            self.stdout.write(f"Processing birthday for {emp.name}...")
            
            # 1. Automatically generate a Kudos on the Recognition Wall
            # Check if one was already auto-generated today to avoid duplicates
            already_generated = Kudos.objects.filter(
                to_name=emp.name,
                category="Above & Beyond",
                from_name="System Bot",
                created_at__date=today
            ).exists()
            
            if not already_generated:
                Kudos.objects.create(
                    organization=emp.organization,
                    site=emp.site,
                    from_name="System Bot",
                    from_initials="SB",
                    to_name=emp.name,
                    to_initials=emp.initials,
                    message=f"🎉 Happy Birthday, {emp.name}! Wishing you a fantastic day from the entire team! 🎂",
                    category="Above & Beyond",
                    reactions=0
                )
                
                # 2. Trigger Real-Time SMTP Email
                if emp.email:
                    try:
                        send_mail(
                            subject="Happy Birthday!",
                            message=f"Hi {emp.name},\n\nWishing you a very Happy Birthday from all of us!\n\nCheers,\nSystem Bot",
                            from_email="system@company.local",
                            recipient_list=[emp.email],
                            fail_silently=False,
                        )
                        self.stdout.write(self.style.SUCCESS(f"Successfully sent birthday email to {emp.email}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Failed to send email to {emp.email}: {e}"))
                
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Finished checking birthdays. Processed {count} employees."))
