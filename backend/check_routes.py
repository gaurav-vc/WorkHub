import os
import django
import sys

# Setup Django
sys.path.append(r'c:\Users\MC VIP\OneDrive\Documents\project\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from role_base_access.models import RoleAccessMapping

routes = {}
for rm in RoleAccessMapping.objects.all():
    routes[rm.frontend_site_id] = rm.site_name

print("Total RoleAccessMappings:", RoleAccessMapping.objects.count())
print("Unique frontend_site_id mapped to URLs:")
for k, v in list(routes.items())[:20]:
    print(f"{k} -> {v}")
