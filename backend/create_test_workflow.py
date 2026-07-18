import os
import django
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from workflows.models import Workflow
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
if not admin:
    admin = User.objects.first()

org = getattr(admin, 'organization', None)

workflow_data = {
    "nodes": [
        {
            "id": "trigger-1",
            "type": "custom",
            "position": {"x": 250, "y": 50},
            "data": {
                "label": "Task Created",
                "icon": "check-square",
                "type": "trigger",
                "config": {}
            }
        },
        {
            "id": "action-task",
            "type": "custom",
            "position": {"x": 250, "y": 150},
            "data": {
                "label": "Create Task",
                "icon": "check-square",
                "type": "action",
                "config": {
                    "taskTitle": "Important Review Required",
                    "taskDesc": "Please review the documents before Friday.",
                    "assignee": str(admin.id) if admin else ""
                }
            }
        },
        {
            "id": "action-notify",
            "type": "custom",
            "position": {"x": 250, "y": 250},
            "data": {
                "label": "Send Notification",
                "icon": "bell",
                "type": "action",
                "config": {
                    "userId": str(admin.id) if admin else "",
                    "title": "URGENT: New Task Assigned",
                    "message": "You have a new task assigned via Workflow."
                }
            }
        },
        {
            "id": "action-email",
            "type": "custom",
            "position": {"x": 250, "y": 350},
            "data": {
                "label": "Send Email",
                "icon": "mail",
                "type": "action",
                "config": {
                    "email": admin.email if admin and admin.email else "admin@workhub.com",
                    "subject": "Workflow Auto-Email",
                    "body": "Hello, this email was sent automatically by the workflow engine!"
                }
            }
        }
    ],
    "edges": [
        {
            "id": "e1",
            "source": "trigger-1",
            "target": "action-task",
            "type": "default"
        },
        {
            "id": "e2",
            "source": "action-task",
            "target": "action-notify",
            "type": "default"
        },
        {
            "id": "e3",
            "source": "action-notify",
            "target": "action-email",
            "type": "default"
        }
    ]
}

wf = Workflow.objects.create(
    name="System Test Workflow",
    description="A fully configured workflow to test the new dynamic nodes.",
    active=True,
    nodes=workflow_data,
    organization=org
)

print(f"Created Workflow: {wf.name} (ID: {wf.id})")
