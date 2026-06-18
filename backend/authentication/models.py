from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import random

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict) # Persists permission checklists

    def __str__(self):
        return self.name


class Organization(models.Model):
    name        = models.CharField(max_length=200)
    state       = models.CharField(max_length=100)
    city        = models.CharField(max_length=100, blank=True, default='')
    address     = models.TextField(blank=True, default='')
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.state}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    target = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

# Added permanently with a unique related_name to resolve the User conflict
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='auth_profile')
    USER_TYPE_CHOICES = [
        ('super_user', 'Super User'),
        ('site_admin', 'Site Admin'),
        ('employee', 'Employee'),
    ]
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='employee')
    role_relationship = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    reporting_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    
    # --- Migrated from api.UserProfile ---
    ROLE_CHOICES = [
        ('PM', 'Product Manager'),
        ('DEV', 'Developer'),
        ('DESIGN', 'Designer'),
        ('QA', 'QA Engineer'),
        ('DEVOPS', 'DevOps Engineer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PM')
    avatar_initials = models.CharField(max_length=3, blank=True)
    leave_balance = models.IntegerField(default=20)
    points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    badges = models.JSONField(default=list, blank=True)

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            name = self.user.get_full_name()
            parts = name.split() if name else [self.user.username]
            self.avatar_initials = ''.join(p[0] for p in parts[:2]).upper()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Auth Profile for {self.user.username}"

class OTPToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def save(self, *args, **kwargs):
        if not self.otp_code:
            self.otp_code = f"{random.randint(100000, 999999)}"
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=15)
        super().save(*args, **kwargs)
        
    def is_valid(self):
        return timezone.now() <= self.expires_at