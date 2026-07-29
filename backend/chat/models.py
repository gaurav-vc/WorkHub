from django.db import models
from core.tenant import TenantModel
from django.contrib.auth import get_user_model

User = get_user_model()

class Channel(TenantModel):
    name = models.CharField(max_length=100, unique=False, blank=True)
    description = models.CharField(max_length=255, blank=True)
    is_group = models.BooleanField(default=False)
    members = models.ManyToManyField(User, related_name='chat_channels')

    def __str__(self):
        return self.name or "1-to-1 Chat"


class Message(TenantModel):
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

class UserChannelState(TenantModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='channel_states')
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='user_states')
    last_read_timestamp = models.DateTimeField(auto_now_add=True)
    cleared_until_timestamp = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'channel')

    def __str__(self):
        return f"{self.user.username} state for {self.channel.name}"