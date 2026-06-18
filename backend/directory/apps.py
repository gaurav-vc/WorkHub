from django.apps import AppConfig


class DirectoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'directory'

    def ready(self):
        # Import inside ready to avoid circular imports / AppRegistryNotReady
        import os
        # Only run the scheduler once (prevents duplicate runs in runserver auto-reload)
        if os.environ.get('RUN_MAIN', None) != 'true':
            from .jobs import start_scheduler
            start_scheduler()
