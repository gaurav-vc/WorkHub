import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from role_base_access.models import RoleAccessMapping
from authentication.models import Role

# Add hr-attendance
route_id = "hr-attendance"
route_path = "/hr/attendance"
route_title = "Attendance"

dynamic_roles = list(Role.objects.values_list('name', flat=True))
roles = list(set(['admin', 'user'] + [r.lower() for r in dynamic_roles]))

for role in roles:
    mapping_id = f"{route_id}::{role}"
    obj, created = RoleAccessMapping.objects.get_or_create(
        id=mapping_id,
        defaults={
            'site_id': route_id,
            'site_name': route_path,
            'role': role,
            'title': route_title,
            'permissions': {
                'view': role == 'admin',
                'create': role == 'admin',
                'edit': role == 'admin'
            }, 
            'module_state': {'active': True}
        }
    )
    if not created:
        perms = obj.permissions
        modified = False
        for key in ['view', 'create', 'edit']:
            if key not in perms:
                perms[key] = (role == 'admin')
                modified = True
        if modified:
            obj.permissions = perms
            obj.save()
print("Successfully synced Attendance to Role Permissions.")
