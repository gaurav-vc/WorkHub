from django.contrib.auth.models import User
from authentication.models import UserProfile, Role

try:
    user = User.objects.get(email='gauravkokane420op@gmail.com')
    admin_role, _ = Role.objects.get_or_create(name='admin')
    
    # Try auth_profile first
    if hasattr(user, 'auth_profile'):
        profile = user.auth_profile
        profile.user_type = 'org_admin'
        profile.role_relationship = admin_role
        profile.save()
        print("Updated auth_profile for gauravkokane420op")
    else:
        profile = UserProfile.objects.create(user=user, user_type='org_admin', role_relationship=admin_role)
        print("Created auth_profile for gauravkokane420op")
except User.DoesNotExist:
    print("User gauravkokane420op@gmail.com not found.")
except Exception as e:
    print("Error:", e)
