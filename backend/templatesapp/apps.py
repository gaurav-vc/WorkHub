from django.apps import AppConfig

class TemplatesappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'templatesapp'
    verbose_name = 'Template Marketplace'

    def ready(self):
        # Implicitly load signals to ensure registry hooks up safely
        import templatesapp.signals  # noqa