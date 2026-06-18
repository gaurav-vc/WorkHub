from django.apps import apps
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_template_import_notification(user, project, template):
        """
        Safely dispatches a notification using the existing Notification app.
        Fails silently to avoid breaking the import transaction if notification module differs.
        """
        try:
            Notification = apps.get_model('notifications', 'Notification')
            Notification.objects.create(
                recipient=user,
                title="Template Imported Successfully",
                message=f"The '{template.title}' template has been fully imported into '{project.name}'.",
                type='system',
                related_object_id=project.id
            )
        except LookupError:
            logger.warning("Notifications app not found. Skipping notification.")
        except Exception as e:
            logger.error(f"Failed to send import notification: {str(e)}")