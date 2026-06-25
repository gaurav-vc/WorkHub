import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from policies.models import Policy
from django.contrib.auth.models import User

# Let's get the first user
user = User.objects.first()

try:
    from core.middleware import _thread_locals
    _thread_locals.user = user

    policy = Policy(title="Test", category="General", version="1.0", content="Test content")
    policy.save()
    print("Policy created successfully:", policy.id)
except Exception as e:
    import traceback
    traceback.print_exc()
