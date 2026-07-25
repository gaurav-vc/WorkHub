import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
try:
    django.setup()
except Exception:
    os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
    django.setup()

from django.apps import apps
from core.tenant import TenantModel
from organization.models import Organization, Site

def backfill():
    org = Organization.objects.first()
    site = Site.objects.first()

    if not org:
        print("No organization found. Please create one first.")
        return

    total_updated = 0
    for model in apps.get_models():
        if issubclass(model, TenantModel):
            try:
                records = model.all_objects.filter(organization__isnull=True)
                count = records.count()
                if count > 0:
                    records.update(organization=org, site=site)
                    print(f"Updated {count} records in {model.__name__}")
                    total_updated += count
            except Exception as e:
                print(f"Skipping {model.__name__} due to error: {e}")

    print(f"Data backfill complete! Re-linked {total_updated} missing items to your Organization.")

if __name__ == "__main__":
    backfill()
