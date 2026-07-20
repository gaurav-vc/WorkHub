from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class Organization(models.Model):
    org_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active', choices=[('active', 'Active'), ('inactive', 'Inactive')])
    contact_details = models.JSONField(default=dict, blank=True)
    
    # Company Details
    company_name = models.CharField(max_length=255, blank=True, null=True)
    entity = models.CharField(max_length=255, blank=True, null=True)
    site_location = models.CharField(max_length=255, blank=True, null=True)
    
    # Location Details
    country = models.CharField(max_length=255, blank=True, null=True)
    region = models.CharField(max_length=255, blank=True, null=True)
    state = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    zone = models.CharField(max_length=255, blank=True, null=True)
    
    # Advanced Options
    white_label = models.BooleanField(default=False)
    sub_domain = models.CharField(max_length=255, blank=True, null=True)
    advanced_settings = models.JSONField(default=dict, blank=True)
    
    # Billing
    solution_type = models.CharField(max_length=255, blank=True, null=True)
    solution_for = models.CharField(max_length=255, blank=True, null=True)
    billing_term = models.CharField(max_length=255, blank=True, null=True)
    rate_of_billing = models.CharField(max_length=255, blank=True, null=True)
    billing_cycle = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    project_duration = models.CharField(max_length=255, blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    billing_date = models.DateField(blank=True, null=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_organizations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('PM', 'Product Manager'),
        ('DEV', 'Developer'),
        ('DESIGN', 'Designer'),
        ('QA', 'QA Engineer'),
        ('DEVOPS', 'DevOps Engineer'),
    ]
    # Added unique related_name
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='org_profile')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    site = models.ForeignKey('Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='users_profiles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PM')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    avatar_initials = models.CharField(max_length=3, blank=True)
    leave_balance = models.IntegerField(default=20)

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            name = self.user.get_full_name()
            parts = name.split() if name else [self.user.username]
            self.avatar_initials = ''.join(p[0] for p in parts[:2]).upper()
        super().save(*args, **kwargs)

class Site(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='sites', null=True, blank=True)
    site_name = models.CharField(max_length=255)
    site_code = models.CharField(max_length=100, blank=True, null=True)
    product_type = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    location_address = models.TextField(blank=True, null=True)
    activate_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active')
    
    # Contact Person
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_phone = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    
    # Modules (JSON)
    modules_access = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.site_name} - {self.site_code}"

class Payment(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payments')
    invoice_number = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    billing_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=50, choices=[('paid', 'Paid'), ('overdue', 'Overdue'), ('pending', 'Pending')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice_number} - {self.organization.name} - {self.status}"