from django.db import models
from core.middleware import get_current_user
from django.core.exceptions import PermissionDenied

def get_current_organization():
    user = get_current_user()
    if not user or not user.is_authenticated:
        return None
    try:
        profile = getattr(user, 'auth_profile', None)
        if profile and profile.user_type == 'super_user':
            return None # Super admin doesn't get a tenant scope by default
            
        org_profile = getattr(user, 'org_profile', None)
        if org_profile and org_profile.organization:
            return org_profile.organization
    except Exception:
        pass
    return None

def get_current_site():
    user = get_current_user()
    if not user or not user.is_authenticated:
        return None
    try:
        org_profile = getattr(user, 'org_profile', None)
        if org_profile and org_profile.site:
            return org_profile.site
    except Exception:
        pass
    return None

class TenantManager(models.Manager):
    def get_queryset(self):
        # We need to apply tenant filtering unconditionally for all read queries.
        user = get_current_user()
        org = get_current_organization()
        site = get_current_site()
        
        # Super admin sees NO tenant data
        if user and getattr(getattr(user, 'auth_profile', None), 'user_type', None) == 'super_user':
            return super().get_queryset().none()
            
        if not org:
            # Bypass if no user context is found to allow background tasks.
            if user is None:
                return super().get_queryset()
            return super().get_queryset().none()
            
        qs = super().get_queryset().filter(organization=org)
        
        # Site Isolation Logic
        if user:
            user_type = getattr(getattr(user, 'auth_profile', None), 'user_type', 'employee')
            if user_type in ['employee', 'site_admin'] and site:
                qs = qs.filter(site=site)
                
        return qs

class TenantModel(models.Model):
    """
    Abstract base model that ensures every record is tied to an organization and optionally a site.
    """
    organization = models.ForeignKey(
        'organization.Organization',
        on_delete=models.CASCADE,
        null=True,  # Set to True temporarily for soft migration
        blank=True,
        related_name='%(class)s_records'
    )
    site = models.ForeignKey(
        'organization.Site',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='%(class)s_site_records'
    )

    objects = TenantManager()
    all_objects = models.Manager() # Bypasses tenant filtering (for admin/scripts)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.organization_id:
            org = get_current_organization()
            if org:
                self.organization = org
            else:
                user = get_current_user()
                if user and getattr(getattr(user, 'auth_profile', None), 'user_type', None) == 'super_user':
                    raise PermissionDenied("Super Admins cannot create tenant-specific records.")
                elif user:
                    raise PermissionDenied("You must belong to an organization to create records.")
                    
        # Also auto-assign site if it's available and not already set
        if not self.site_id:
            site = get_current_site()
            if site:
                self.site = site
                
        super().save(*args, **kwargs)
