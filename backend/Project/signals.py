import threading
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
import datetime

# Thread-local storage to prevent infinite recursion
_thread_locals = threading.local()

def is_syncing():
    return getattr(_thread_locals, 'syncing', False)

def set_syncing(value):
    _thread_locals.syncing = value

# Import inside functions or delayed to avoid circular imports?
# Actually we can import them here if Project/apps.py registers signals in ready().
from Project.models import Task
from boards.models import Board, Column, Card
from calendar_meeting.models import Meeting

@receiver(post_save, sender=Task)
def sync_task_to_card_and_event(sender, instance, created, **kwargs):
    if kwargs.get('raw', False): return
    if is_syncing():
        return
    
    # DO NOT SYNC Project Tasks (where project is not None)
    if getattr(instance, 'project_id', None) is not None:
        return
        
    set_syncing(True)
    try:
        user = instance.assigned_to or instance.created_by
        if not user:
            return

        # 1. Sync to Card
        board, _ = Board.objects.get_or_create(
            title="My Global Tasks",
            owner=user,
            defaults={'template_type': 'personal'}
        )
        
        # Map Task status to Column title
        col_title = (instance.status or "todo").replace('_', ' ').title()
        if not col_title:
            col_title = "Todo"
            
        column, _ = Column.objects.get_or_create(
            board=board,
            title=col_title,
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        
        # Find existing card or create
        card = Card.objects.filter(title=instance.title, assignee=user).first()
        if not card:
            card = Card.objects.filter(title=instance.title, created_by=user).first()
            
        if card:
            card.column = column
            card.description = instance.description
            card.due_date = instance.due_date
            card.priority = instance.priority
            card.status = instance.status
            card.save()
        else:
            Card.objects.create(
                title=instance.title,
                description=instance.description,
                column=column,
                assignee=user,
                created_by=user,
                due_date=instance.due_date,
                priority=instance.priority,
                status=instance.status
            )
            
        # 2. Sync to Calendar Meeting (type: task)
        # Find existing meeting
        meeting = Meeting.objects.filter(title=instance.title, organizer=user, meeting_type='task').first()
        due_dt = timezone.now()
        
        due_date_val = instance.due_date
        if isinstance(due_date_val, str):
            try:
                due_date_val = datetime.datetime.strptime(due_date_val, '%Y-%m-%d').date()
            except ValueError:
                due_date_val = timezone.now().date()
                
        if due_date_val:
            due_time_val = instance.due_time or datetime.time(9, 0)
            if isinstance(due_time_val, str):
                try:
                    due_time_val = datetime.datetime.strptime(due_time_val, '%H:%M:%S').time()
                except ValueError:
                    due_time_val = datetime.time(9, 0)
                    
            naive_dt = datetime.datetime.combine(due_date_val, due_time_val)
            due_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
            
        if meeting:
            meeting.meeting_time = due_dt
            meeting.description = instance.description
            meeting.save()
        else:
            Meeting.objects.create(
                title=instance.title,
                description=instance.description,
                organizer=user,
                meeting_time=due_dt,
                meeting_type='task',
                duration='1h'
            )
    except Exception as e:
        print(f"Error syncing Task: {e}")
    finally:
        set_syncing(False)

@receiver(post_save, sender=Card)
def sync_card_to_task_and_event(sender, instance, created, **kwargs):
    if kwargs.get('raw', False): return
    if is_syncing():
        return
        
    # Only sync cards from personal boards
    if instance.column.board.template_type != 'personal':
        return
        
    set_syncing(True)
    try:
        user = instance.assignee or instance.created_by
        if not user:
            return
            
        # 1. Sync to Task
        task = Task.objects.filter(title=instance.title, assigned_to=user, project__isnull=True).first()
        if not task:
            task = Task.objects.filter(title=instance.title, created_by=user, project__isnull=True).first()
            
        # Map Column title back to Task status
        status = instance.column.title.lower().replace(' ', '_')
            
        if task:
            task.description = instance.description
            task.due_date = instance.due_date or timezone.now().date()
            task.priority = instance.priority or 'P3'
            task.status = status
            task.save()
        else:
            Task.objects.create(
                title=instance.title,
                description=instance.description,
                assigned_to=user,
                created_by=user,
                due_date=instance.due_date or timezone.now().date(),
                priority=instance.priority or 'P3',
                status=status
            )
            
        # 2. Sync to Calendar Meeting (type: task)
        meeting = Meeting.objects.filter(title=instance.title, organizer=user, meeting_type='task').first()
        due_dt = timezone.now()
        
        due_date_val = instance.due_date
        if isinstance(due_date_val, str):
            try:
                due_date_val = datetime.datetime.strptime(due_date_val, '%Y-%m-%d').date()
            except ValueError:
                due_date_val = timezone.now().date()
                
        if due_date_val:
            naive_dt = datetime.datetime.combine(due_date_val, datetime.time(9, 0))
            due_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
            
        if meeting:
            meeting.meeting_time = due_dt
            meeting.description = instance.description
            meeting.save()
        else:
            Meeting.objects.create(
                title=instance.title,
                description=instance.description,
                organizer=user,
                meeting_time=due_dt,
                meeting_type='task',
                duration='1h'
            )
    except Exception as e:
        print(f"Error syncing Card: {e}")
    finally:
        set_syncing(False)

@receiver(post_save, sender=Meeting)
def sync_event_to_task_and_card(sender, instance, created, **kwargs):
    if kwargs.get('raw', False): return
    if is_syncing():
        return
        
    # Only sync 'task' type events
    if instance.meeting_type != 'task':
        return
        
    set_syncing(True)
    try:
        user = instance.organizer
        
        # 1. Sync to Task
        task = Task.objects.filter(title=instance.title, assigned_to=user, project__isnull=True).first()
        if not task:
            task = Task.objects.filter(title=instance.title, created_by=user, project__isnull=True).first()
            
        due_date = instance.meeting_time.date()
        due_time = instance.meeting_time.time()
        
        if task:
            task.description = instance.description or ""
            task.due_date = due_date
            task.due_time = due_time
            task.save()
        else:
            Task.objects.create(
                title=instance.title,
                description=instance.description or "",
                assigned_to=user,
                created_by=user,
                due_date=due_date,
                due_time=due_time,
                status='todo'
            )
            
        # 2. Sync to Card
        board, _ = Board.objects.get_or_create(
            title="My Global Tasks",
            owner=user,
            defaults={'template_type': 'personal'}
        )
        column, _ = Column.objects.get_or_create(
            board=board,
            title="Todo",
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        
        card = Card.objects.filter(title=instance.title, assignee=user).first()
        if not card:
            card = Card.objects.filter(title=instance.title, created_by=user).first()
            
        if card:
            card.description = instance.description or ""
            card.due_date = due_date
            card.save()
        else:
            Card.objects.create(
                title=instance.title,
                description=instance.description or "",
                column=column,
                assignee=user,
                created_by=user,
                due_date=due_date,
                status='open'
            )
    except Exception as e:
        print(f"Error syncing Event: {e}")
    finally:
        set_syncing(False)

@receiver(post_delete, sender=Task)
def delete_synced_task(sender, instance, **kwargs):
    if kwargs.get('raw', False): return
    if is_syncing(): return
    if getattr(instance, 'project_id', None) is not None: return
    
    set_syncing(True)
    try:
        user = instance.assigned_to or instance.created_by
        if user:
            Card.objects.filter(title=instance.title, assignee=user).delete()
            Meeting.objects.filter(title=instance.title, organizer=user, meeting_type='task').delete()
    finally:
        set_syncing(False)
