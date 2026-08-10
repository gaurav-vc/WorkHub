from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'integrations'

    def ready(self):
        import os
        # Avoid running scheduler multiple times (e.g. in dev server auto-reload)
        if os.environ.get('RUN_MAIN', None) != 'true':
            return
            
        from apscheduler.schedulers.background import BackgroundScheduler
        from .tasks import sync_all_emails
        
        scheduler = BackgroundScheduler()
        # Run every 2 minutes
        scheduler.add_job(sync_all_emails, 'interval', minutes=2)
        scheduler.start()
