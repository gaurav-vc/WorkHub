from django.db import models
from core.tenant import TenantModel
from django.contrib.auth import get_user_model

User = get_user_model()

class Board(TenantModel):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=50) # e.g., 'sales', 'project'
    owner = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default='planning')

    def __str__(self):
        return self.title

class Column(TenantModel):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='columns')
    title = models.CharField(max_length=100)
    color = models.CharField(max_length=50, default="bg-primary")
    order = models.IntegerField(default=0) # Essential for drag-and-drop ordering

    def __str__(self):
        return self.title

class Card(TenantModel):
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='cards')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    labels = models.JSONField(default=list, blank=True) # Array of objects: [{text: "", color: ""}]
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cards')
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=50, default='open')
    order = models.IntegerField(default=0) # For vertical drag-and-drop
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_cards')

    # Gantt Chart / Timeline fields
    start_day = models.IntegerField(default=0)
    duration = models.IntegerField(default=3)
    color = models.CharField(max_length=50, default='bg-primary')
    dependency = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='dependent_timeline_cards')

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        newly_assigned_user = None

        if not is_new:
            old_card = Card.objects.get(pk=self.pk)
            if old_card.assignee != self.assignee and self.assignee:
                newly_assigned_user = self.assignee
        else:
            if self.assignee:
                newly_assigned_user = self.assignee

        super().save(*args, **kwargs)

        if newly_assigned_user and newly_assigned_user != self.created_by:
            try:
                from workspace.models import Notification
                from django.db import transaction
                with transaction.atomic():
                    Notification.objects.create(
                        user=newly_assigned_user,
                        type="card_assigned",
                        title="Card Assigned",
                        message=f"You have been assigned to card '{self.title}'",
                        link="/collaboration/boards"
                    )
            except Exception as e:
                print(f"Error creating notification: {e}")

class CardChecklist(TenantModel):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='checklists')
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class CardSubtask(TenantModel):
    parent_card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='pending')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_subtasks')
    created_at = models.DateTimeField(auto_now_add=True)

class CardComment(TenantModel):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class CardAttachment(TenantModel):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='board_attachments/')
    file_name = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class CardChat(TenantModel):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='chats')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)