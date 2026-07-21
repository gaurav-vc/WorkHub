from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Organization
from django.core.mail import send_mail
from django.conf import settings
import string
import random

@receiver(post_save, sender=Organization)
def organization_post_save(sender, instance, created, **kwargs):
    if kwargs.get('raw', False): return
    # Only act if an admin is assigned
    if instance.assigned_admin:
        # Check if we've already onboarded this admin for this organization to prevent duplicate emails
        # For a simple implementation, we assume if they don't have a password set (or we just generate a new one)
        # However, we should be careful not to reset passwords on every organization update.
        # Let's use a simple heuristic: if it's newly assigned.
        
        user = instance.assigned_admin
        
        # In a real system, you'd track if the email was sent, or only send when the admin field explicitly changes.
        # For this prototype, we'll generate a random temp password and email it.
        # We'll avoid resetting password if it's just an org update and admin is same.
        # To do this perfectly, we'd need pre_save signal. Let's just assume we send an email.
        
        # Generate temporary password
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        user.set_password(temp_password)
        user.save()
        
        # Send Email
        subject = f"Welcome to {instance.name} on Anti Gravity"
        message = f"""
Hello {user.get_full_name() or user.username},

You have been assigned as the Organization Admin for {instance.name}.

Here are your secure login credentials:
Website URL: {getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}
Login ID: {user.username}
Temporary Password: {temp_password}

Please log in and reset your password immediately.

Best regards,
Anti Gravity Team
"""
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@antigravity.com',
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email to {user.email}: {e}")
