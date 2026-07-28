from django.contrib.auth.models import User

def get_visible_users(user):
    """
    Returns a queryset of User objects that the given user is allowed to see data for.
    - Super users see all users.
    - Org Admins see all users in their organization.
    - Site Admins and Employees see all users in their site.
    - Users without an organization only see themselves.
    """
    if getattr(getattr(user, 'auth_profile', None), 'user_type', '') == 'super_user' or user.is_superuser:
        return User.objects.all()
        
    try:
        org_profile = getattr(user, 'org_profile', None)
        if org_profile and org_profile.organization:
            qs = User.objects.filter(org_profile__organization=org_profile.organization)
            user_type = getattr(getattr(user, 'auth_profile', None), 'user_type', 'employee')
            if user_type in ['employee', 'site_admin']:
                if org_profile.site:
                    qs = qs.filter(org_profile__site=org_profile.site)
                else:
                    qs = qs.filter(org_profile__site__isnull=True)
            return qs
    except Exception:
        pass
        
    # Fallback: only see themselves
    return User.objects.filter(id=user.id)
