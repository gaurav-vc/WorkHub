import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
try:
    django.setup()
except Exception:
    os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
    django.setup()

from django.contrib.auth import get_user_model
from boards.models import Card
from organization.models import Organization, Site

User = get_user_model()

def diagnose():
    try:
        user = User.objects.get(email="sejalmeher2104@gmail.com")
        print("User:", user.username)
        if hasattr(user, 'org_profile'):
            print("User Org:", user.org_profile.organization)
            print("User Site:", user.org_profile.site)
        else:
            print("User has no org profile.")
            
        cards = Card.all_objects.all()
        print(f"Total Cards in DB: {cards.count()}")
        print("Cards by assignee:")
        for c in cards:
            assignee = c.assignee.email if c.assignee else "None"
            print(f"- '{c.title}' | Assignee: {assignee} | Org: {c.organization} | Site: {c.site}")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    diagnose()
