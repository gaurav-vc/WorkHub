import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command
from recognition.models import Kudos
import datetime

today = datetime.date.today()

# Delete today's system bot Kudos to allow the script to re-trigger!
deleted_count, _ = Kudos.objects.filter(
    category="Above & Beyond",
    from_name="System Bot",
    created_at__date=today
).delete()

print(f"Cleared {deleted_count} previous birthday kudos from today to allow re-triggering!")

# Run the birthday command!
print("Re-triggering birthday emails...")
call_command('check_birthdays')
print("Done!")
