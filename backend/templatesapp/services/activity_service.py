from django.apps import apps
import logging

logger = logging.getLogger(__name__)

class ActivityService:
    @staticmethod
    def log_template_import(user, project, template):
        """
        Safely logs activity to the existing collaboration/analytics module.
        """
        try:
            # Attempt to map to standard existing activity model
            TeamActivity = apps.get_model('workspace', 'TeamActivity') # Adjust app label if it's 'collaboration'
            TeamActivity.objects.create(
                user=user,
                action=f"imported template '{template.title}' into",
                target=project.name
            )
        except LookupError:
            logger.warning("Activity log model not found. Skipping activity log.")
        except Exception as e:
            logger.error(f"Failed to log activity: {str(e)}")