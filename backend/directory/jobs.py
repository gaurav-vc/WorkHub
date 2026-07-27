from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_birthday_emails():
    import logging
    from django.core.management import call_command
    
    logger = logging.getLogger(__name__)
    logger.info("Triggering automatic birthday check and emails...")
    try:
        call_command('check_birthdays')
        logger.info("Successfully completed birthday check.")
    except Exception as e:
        logger.error(f"Failed to execute check_birthdays command: {e}")

def check_overdue_tasks():
    from Project.models import Task
    from workspace.models import Notification
    
    overdue_tasks = Task.objects.filter(
        started_at__isnull=False,
        time_interval_minutes__isnull=False,
        is_queued=False,
        deadline_alert_sent=False
    ).exclude(status__in=['done', 'completed', 'closed'])
    
    for task in overdue_tasks:
        elapsed = (timezone.now() - task.started_at).total_seconds() / 60.0
        if elapsed > task.time_interval_minutes:
            task.deadline_alert_sent = True
            task.save(update_fields=['deadline_alert_sent'])
            
            # Send Notification
            msg = f"Task '{task.title}' is overdue! Time interval exceeded."
            if task.assigned_to:
                try:
                    Notification.objects.create(
                        type="task_overdue",
                        title="Task Overdue",
                        message=msg,
                        link="/projects",
                        user=task.assigned_to
                    )
                except Exception:
                    pass
            if task.created_by and task.created_by != task.assigned_to:
                try:
                    Notification.objects.create(
                        type="task_overdue",
                        title="Task Overdue (Created by you)",
                        message=msg,
                        link="/projects",
                        user=task.created_by
                    )
                except Exception:
                    pass

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Schedule to run every day at 8:00 AM
    scheduler.add_job(send_birthday_emails, 'cron', hour=8, minute=0)
    
    # Check for overdue tasks every 30 minutes
    scheduler.add_job(check_overdue_tasks, 'interval', minutes=30)
    
    scheduler.start()
    logger.info("Scheduler started.")
