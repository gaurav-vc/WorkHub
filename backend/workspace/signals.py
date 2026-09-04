import logging
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from workspace.utils import notify_user

logger = logging.getLogger(__name__)

try:
    from chat.models import Message
    from Project.models import Task
    from calendar_meeting.models import Meeting
    
    @receiver(post_save, sender=Message)
    def notify_on_message(sender, instance, created, **kwargs):
        if created and instance.user and getattr(instance, 'channel', None):
            sender_name = instance.user.first_name or instance.user.username
            for member in instance.channel.members.exclude(id=instance.user.id):
                notify_user(
                    user=member,
                    title=f"New message from {sender_name}",
                    message=instance.content[:50] + ("..." if len(instance.content) > 50 else ""),
                    notification_type="chat",
                    link=f"/chat/{instance.channel.id}"
                )

    @receiver(post_save, sender=Task)
    def notify_on_task_save(sender, instance, created, **kwargs):
        if created and getattr(instance, 'assigned_to', None):
            notify_user(
                user=instance.assigned_to,
                title="New Task Assigned",
                message=f"You have been assigned to: {instance.title}",
                notification_type="task",
                link=f"/tasks/{instance.id}"
            )

    @receiver(m2m_changed, sender=Task.assignees.through)
    def notify_on_task_assignees(sender, instance, action, pk_set, **kwargs):
        if action == "post_add" and pk_set:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            for user_id in pk_set:
                user = User.objects.filter(id=user_id).first()
                if user:
                    notify_user(
                        user=user,
                        title="New Task Assigned",
                        message=f"You have been added to task: {instance.title}",
                        notification_type="task",
                        link=f"/tasks/{instance.id}"
                    )

    @receiver(m2m_changed, sender=Meeting.attendees.through)
    def notify_on_meeting_attendees(sender, instance, action, pk_set, **kwargs):
        if action == "post_add" and pk_set:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            for user_id in pk_set:
                user = User.objects.filter(id=user_id).first()
                if user:
                    notify_user(
                        user=user,
                        title="Meeting Invite",
                        message=f"You are invited to: {instance.title}",
                        notification_type="meeting",
                        link=f"/meetings/{instance.id}"
                    )

except ImportError as e:
    logger.warning(f"Could not import models for notification signals: {e}")
