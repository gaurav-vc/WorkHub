import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from organization.models import Site

try:
    site = Site.objects.first()
    if site:
        print(f"Deleting Site: {site.id} - {site.site_name}")
        site.delete()
        print("Successfully deleted!")
    else:
        print("No Sites found in the database.")
except Exception as e:
    import traceback
    traceback.print_exc()
