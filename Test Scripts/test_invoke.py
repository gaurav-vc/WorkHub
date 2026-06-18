import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from ai_agents.views import AIAgentViewSet

user = User.objects.first()
print("Testing with user:", user)

factory = RequestFactory()
request = factory.post('/api/ai_agents/agents/invoke/', {
    'agent': 'docs',
    'action': 'summarize',
    'document_content': 'Hello world'
}, content_type='application/json')
request.user = user

view = AIAgentViewSet.as_view({'post': 'invoke'})
try:
    response = view(request)
    print("STATUS:", response.status_code)
    print("DATA:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()
