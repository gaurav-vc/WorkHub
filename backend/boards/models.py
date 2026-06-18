from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Board(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=50) # e.g., 'sales', 'project'
    owner = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default='planning')

    def __str__(self):
        return self.title

class Column(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='columns')
    title = models.CharField(max_length=100)
    color = models.CharField(max_length=50, default="bg-primary")
    order = models.IntegerField(default=0) # Essential for drag-and-drop ordering

    def __str__(self):
        return self.title

class Card(models.Model):
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

class CardChecklist(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='checklists')
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class CardSubtask(models.Model):
    parent_card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='pending')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_subtasks')
    created_at = models.DateTimeField(auto_now_add=True)

class CardComment(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class CardAttachment(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='board_attachments/')
    file_name = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class CardChat(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='chats')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)