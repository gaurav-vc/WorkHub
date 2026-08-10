from django.db import models
from core.tenant import TenantModel

# Notice: There are NO imports from .views here!

class Integration(TenantModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100)
    connected = models.BooleanField(default=False)
    icon = models.CharField(max_length=50, default="🔌")
    # Store API Keys and Webhooks securely in a JSON object
    config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name

from django.conf import settings

class MicrosoftCredentials(TenantModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='microsoft_credentials')
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()
    
class EmailAccount(TenantModel):
    PROVIDER_CHOICES = [
        ('microsoft', 'Microsoft Outlook'),
        ('google', 'Google Gmail'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='email_accounts')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    account_email = models.EmailField() # Email address of the connected account
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('user', 'provider', 'account_email')

    def __str__(self):
        return f"{self.user} - {self.provider} - {self.account_email}"

class SyncedEmail(TenantModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='synced_emails')
    account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='emails', null=True, blank=True)
    message_id = models.CharField(max_length=255, unique=True)
    subject = models.CharField(max_length=500, null=True, blank=True)
    body_preview = models.TextField(null=True, blank=True)
    sender_email = models.CharField(max_length=255, null=True, blank=True)
    sender_name = models.CharField(max_length=255, null=True, blank=True)
    received_date = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    web_link = models.URLField(max_length=1000, null=True, blank=True)

    class Meta:
        ordering = ['-received_date']