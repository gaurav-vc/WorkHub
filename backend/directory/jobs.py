from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_birthday_emails():
    # We must import inside the function to avoid AppRegistryNotReady errors
    from .models import Employee
    
    today = timezone.now().date()
    employees = Employee.objects.filter(
        date_of_birth__month=today.month,
        date_of_birth__day=today.day
    ).exclude(email="") # Avoid empty emails

    logger.info(f"Found {employees.count()} birthdays today.")

    for employee in employees:
        try:
            # We construct a photo URL or just skip it if we don't have request context.
            # Without request context, we can just point to settings.MEDIA_URL if we have a domain config, 
            # but simplest is just not rendering the absolute URI for the photo or assuming localhost.
            photo_url = ""
            if employee.photo:
                # This is a naive way to generate absolute URI if we don't have the request
                # In production, we'd use a site framework or an env variable for domain.
                domain = getattr(settings, 'BACKEND_DOMAIN', 'http://localhost:8000')
                photo_url = f"{domain}{employee.photo.url}"

            html_message = f"""
            <html>
                <head></head>
                <body style="font-family: Arial, sans-serif; text-align: center; background-color: #f9fafb; padding: 40px;">
                    <div style="background-color: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #2563EB;">🎉 Happy Birthday, {employee.name}! 🎂</h1>
                        {f'<img src="{photo_url}" alt="Profile Photo" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 4px solid #34D399;"/>' if photo_url else ''}
                        <p style="color: #4B5563; font-size: 18px; line-height: 1.6;">
                            Wishing you a fantastic birthday filled with joy, laughter, and wonderful moments.
                            Thank you for all your hard work and for being an amazing part of our team!
                        </p>
                        <p style="color: #9CA3AF; margin-top: 30px; font-size: 14px;">
                            - From all of us at your company
                        </p>
                    </div>
                </body>
            </html>
            """
            send_mail(
                subject=f"Happy Birthday, {employee.name}! 🎉",
                message=f"Happy Birthday {employee.name}!",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[employee.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Successfully sent birthday email to {employee.email}")
        except Exception as e:
            logger.error(f"Failed to send birthday email to {employee.email}: {e}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Schedule to run every day at 8:00 AM
    scheduler.add_job(send_birthday_emails, 'cron', hour=8, minute=0)
    scheduler.start()
    logger.info("Birthday email scheduler started.")
