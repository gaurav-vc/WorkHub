import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Workhub.settings')
django.setup()

from django.contrib.auth.models import User

try:
    u = User.objects.get(email='sojalmeher2104@gmail.com')
    print("User found:", u.username)
    
    org_profile = getattr(u, 'org_profile', None)
    if org_profile:
        print("Organization:", org_profile.organization.name if org_profile.organization else "None")
        print("Site:", org_profile.site.name if org_profile.site else "None")
        print("Site ID:", org_profile.site_id)
    else:
        print("User has no org_profile!")
        
    auth_profile = getattr(u, 'auth_profile', None)
    if auth_profile:
        print("User Type:", auth_profile.user_type)
    else:
        print("User has no auth_profile!")

except User.DoesNotExist:
    print("User not found in local DB.")
except Exception as e:
    print("Error:", str(e))
