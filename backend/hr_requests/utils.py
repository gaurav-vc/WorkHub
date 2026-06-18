from role_base_access.models import RoleAccessMapping

def get_hr_permissions(user):
    perms = {'view': 'none', 'create': 'none', 'edit': 'none'}
    if user.is_superuser:
         return {'view': 'all', 'create': 'all', 'edit': 'all'}

    try:
        profile = getattr(user, 'auth_profile', None)
        role = profile.role_relationship.name.lower() if profile and profile.role_relationship else 'user'
    except Exception:
        role = 'user'
    
    mapping = RoleAccessMapping.objects.filter(role=role, site_id='hr-requests').first()
    if not mapping:
        mapping = RoleAccessMapping.objects.filter(role='user', site_id='hr-requests').first()

    if mapping and isinstance(mapping.permissions, dict):
        for k in ['view', 'create', 'edit']:
            val = mapping.permissions.get(k)
            if isinstance(val, bool):
                perms[k] = 'all' if val else 'none'
            elif isinstance(val, str):
                perms[k] = val

    return perms

def get_team_users(user):
    from django.contrib.auth.models import User
    team_ids = set()
    def get_reports(u):
        reports = User.objects.filter(auth_profile__reporting_to=u)
        for r in reports:
            if r.id not in team_ids:
                team_ids.add(r.id)
                get_reports(r)
    get_reports(user)
    return User.objects.filter(id__in=team_ids)
