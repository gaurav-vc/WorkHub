import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from role_base_access.models import RoleAccessMapping
from authentication.models import UserProfile, User

mappings = RoleAccessMapping.objects.filter(role='site_manager')
print(f"Total mappings for site_manager: {mappings.count()}")
for m in mappings:
    if m.site_name in ['/hr/directory', '/', '/tasks/my-day']:
        print(f"{m.title} ({m.site_name}): {m.permissions}")

print("\nUsers with role_relationship='site_manager':")
for p in UserProfile.objects.all():
    if p.role_relationship and p.role_relationship.name.lower() == 'site_manager':
        print(f"User: {p.user.username}, Role ID: {p.role_relationship.id}, Emp Role: {p.user.res_employee.role if hasattr(p.user, 'res_employee') else 'None'}")
