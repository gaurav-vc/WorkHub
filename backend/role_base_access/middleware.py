import json
from django.http import JsonResponse
from role_base_access.models import RoleAccessMapping

class RBACEnforcementMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        module_id = request.headers.get('X-Module-ID')
        
        # If no module ID is provided or user is not authenticated, let the view handle it
        if not module_id or not request.user.is_authenticated or request.user.is_superuser:
            return self.get_response(request)

        role = 'user'
        try:
            profile = getattr(request.user, 'auth_profile', None)
            if profile:
                if profile.user_type in ['super_user', 'site_admin']:
                    return self.get_response(request)
                if profile.role_relationship:
                    role = profile.role_relationship.name.lower()
                    
            if role == 'user':
                emp_profile = getattr(request.user, 'res_employee', None)
                if emp_profile and emp_profile.role:
                    role = emp_profile.role.lower()
        except Exception:
            pass

        if role in ['admin', 'site admin']:
            return self.get_response(request)

        # Look up by site_id which matches the frontend route id (e.g. 'tasks-projects')
        mapping = RoleAccessMapping.objects.filter(role=role, site_id=module_id).first()
        if not mapping and role not in ['admin', 'user']:
            # Fallback to base 'user' role mapping if custom role mapping is missing
            mapping = RoleAccessMapping.objects.filter(role='user', site_id=module_id).first()

        if mapping:
            perms = mapping.permissions or {}
            method = request.method
            
            has_perm = False
            if method in ['GET', 'HEAD', 'OPTIONS']:
                has_perm = perms.get('view', False)
            elif method == 'POST':
                has_perm = perms.get('create', False)
            elif method in ['PUT', 'PATCH']:
                has_perm = perms.get('edit', False)
            elif method == 'DELETE':
                has_perm = perms.get('delete', False)
                
            if has_perm in ['none', False, None, 'false']:
                return JsonResponse(
                    {"error": f"You do not have permission to perform this action (Method: {method}) on module {module_id}."}, 
                    status=403
                )
                
        return self.get_response(request)
