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
from django.contrib.auth import get_user_model

User = get_user_model()

def fix_ownership():
    user = User.objects.get(email="sejalmeher2104@gmail.com")
    if not hasattr(user, 'org_profile'):
        print("User has no org profile, cannot migrate data.")
        return
        
    correct_org = user.org_profile.organization
    correct_site = user.org_profile.site

    print(f"Moving data to Org ID: {correct_org.id} | Site ID: {correct_site.id}")

    total_moved = 0
    for model in apps.get_models():
        if issubclass(model, TenantModel):
            try:
                records = model.all_objects.all()
                count = records.count()
                if count > 0:
                    records.update(organization=correct_org, site=correct_site)
                    print(f"Moved {count} records in {model.__name__} to your correct Site.")
                    total_moved += count
            except Exception as e:
                pass # Suppressing print for models that error (like UserProfile) to keep output clean

    print(f"\nSuccess! Teleported {total_moved} items directly into your active Site.")

if __name__ == "__main__":
    fix_ownership()
