from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Channel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    members = models.ManyToManyField(User, related_name='chat_channels')

    def __str__(self):
        return self.name

class Message(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField(blank=True, default="")
    timestamp = models.DateTimeField(auto_now_add=True)
    
    file = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)

    # We can store simple reactions as JSON, or break them into a separate table later
    reactions = models.JSONField(default=list, blank=True) 

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.username} in {self.channel.name}: {self.content[:20]}"

class UserChannelState(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='channel_states')
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='user_states')
    last_read_timestamp = models.DateTimeField(auto_now_add=True)
    cleared_until_timestamp = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'channel')

    def __str__(self):
        return f"{self.user.username} state for {self.channel.name}"