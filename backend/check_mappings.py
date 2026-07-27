import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from role_base_access.models import RoleAccessMapping
from organization.models import Site

print(f"Total RoleAccessMappings globally: {RoleAccessMapping.all_objects.count()}")

mappings = RoleAccessMapping.all_objects.all()
for m in mappings:
    print(f"Mapping ID: {m.id}, Site: {m.site_id}, Role: {m.role}")

