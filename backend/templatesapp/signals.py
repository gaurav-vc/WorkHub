# backend/templatesapp/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Template

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Template)
def log_new_template_creation(sender, instance, created, **kwargs):
    """
    Lightweight signal to log when a new template is added to the marketplace.
    Major business logic (like importing) remains safely in the services layer.
    """
    if created:
        logger.info(f"New template added to marketplace: {instance.title}")