import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
import json

client = Client()

# Let's get the first user
user = User.objects.first()
client.force_login(user)

response = client.post('/api/company/policies/', {
    'title': 'API Test Policy',
    'category': 'General',
    'version': '1.0',
    'content': 'Test content via API'
})

print("Status Code:", response.status_code)
if response.status_code != 201:
    print("Response Body:", response.content.decode('utf-8'))
