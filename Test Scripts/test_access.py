import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from role_base_access.models import RoleAccessMapping

print("All Mappings count:", RoleAccessMapping.objects.count())
print("User Role count:", RoleAccessMapping.objects.filter(role='user').count())
print("Directory Mappings:", list(RoleAccessMapping.objects.filter(site_name='/hr/directory').values('role', 'permissions')))
