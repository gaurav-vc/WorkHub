import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from role_base_access.models import RoleAccessMapping
from authentication.models import UserProfile, Role

User = get_user_model()
print("RoleAccessMapping for site_manager:", RoleAccessMapping.objects.filter(role='site_manager').count())
for m in RoleAccessMapping.objects.filter(role='site_manager'):
    print(m.site_name, m.permissions)

print("\nUsers:")
for u in User.objects.all():
    profile = getattr(u, 'auth_profile', None)
    emp = getattr(u, 'res_employee', None)
    role_rel = profile.role_relationship.name if profile and profile.role_relationship else 'None'
    emp_role = emp.role if emp else 'None'
    print(u.username, u.email, "Auth Role:", role_rel, "Emp Role:", emp_role)
