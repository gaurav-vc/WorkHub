import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from Project.models import Task
from boards.models import Board, Column, Card

tasks = Task.objects.all()
for t in tasks:
    if t.assigned_to:
        board, _ = Board.objects.get_or_create(
            title="My Board",
            owner=t.assigned_to,
            defaults={'template_type': 'personal'}
        )
        column, _ = Column.objects.get_or_create(
            board=board,
            title="Todo",
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        
        # Check if card already exists to avoid duplicates
        if not Card.objects.filter(title=t.title, assignee=t.assigned_to).exists():
            Card.objects.create(
                title=t.title,
                description=t.description,
                column=column,
                assignee=t.assigned_to,
                created_by=t.created_by,
                due_date=t.due_date,
                status=t.status
            )
            print(f"Migrated task: {t.title} for {t.assigned_to.username}")

print("Migration complete!")
