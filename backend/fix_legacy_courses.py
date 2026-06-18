import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from learning_center.models import Course
from organization.models import Organization, Site

org = Organization.objects.first()
site = Site.objects.first()

if org and site:
    count = Course.all_objects.filter(organization__isnull=True).update(organization=org, site=site)
    print(f'Successfully updated {count} legacy courses with organization={org.name} and site={site.name}')
else:
    print('No organization or site found in database!')
