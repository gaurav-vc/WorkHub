import sys
import os
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management.base import BaseCommand
from templatesapp.models import Template, TemplateTask, TemplateCategory

class Command(BaseCommand):
    help = 'Removes all existing static templates and their tasks from the database'

    def handle(self, *args, **options):
        # We delete all templates and template tasks
        # Assuming all existing ones are static/seed data
        
        task_count, _ = TemplateTask.objects.all().delete()
        template_count, _ = Template.objects.all().delete()
        category_count, _ = TemplateCategory.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {task_count} template tasks.'))
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {template_count} templates.'))
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {category_count} template categories.'))
        self.stdout.write(self.style.SUCCESS('All static template data has been removed.'))
