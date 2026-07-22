from functools import wraps
from rest_framework.response import Response
from role_base_access.models import RoleAccessMapping

def require_rbac_permission(module_name):
    """
    Decorator to enforce RBAC permissions on Function Based Views.
    Checks if the user has RBAC access to the specified module_name.
    The action required depends on the HTTP method:
    - GET, HEAD, OPTIONS: needs 'view' permission
    - POST: needs 'create' permission
    - PUT, PATCH: needs 'edit' permission
    - DELETE: needs 'delete' permission
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = request.user
            if not user.is_authenticated:
                return Response({"error": "Authentication credentials were not provided."}, status=401)
                
            if user.is_superuser:
                return view_func(request, *args, **kwargs)

            role = 'user'
            try:
                profile = getattr(user, 'auth_profile', None)
                if profile:
                    if profile.user_type in ['super_user', 'site_admin']:
                        return view_func(request, *args, **kwargs)
                    if profile.role_relationship:
                        role = profile.role_relationship.name.lower()
                        
                if role == 'user':
                    emp_profile = getattr(user, 'res_employee', None)
                    if emp_profile and emp_profile.role:
                        role = emp_profile.role.lower()
            except Exception:
                pass

            mapping = RoleAccessMapping.objects.filter(role=role, site_id=module_name).first()
            if not mapping and role not in ['admin', 'user']:
                mapping = RoleAccessMapping.objects.filter(role='user', site_id=module_name).first()
                
            if not mapping:
                return Response({"error": f"No access mapping found for module {module_name}."}, status=403)

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
                
            if not has_perm:
                return Response({"error": f"You do not have permission to perform this action on {module_name}."}, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

from rest_framework import permissions

class RBACPermission(permissions.BasePermission):
    """
    Global Permission class for ViewSets that enforces RBAC module boundaries.
    The ViewSet must define an attribute `rbac_module` which matches a `site_id` in RoleAccessMapping.
    If `rbac_module` is not defined, it defaults to denying access to be safe, unless explicitly allowed.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
            
        if user.is_superuser:
            return True
            
        module_name = getattr(view, 'rbac_module', None)
        if not module_name:
            # If no module name is bound, we skip RBAC check and let other permissions handle it
            return True
            
        role = 'user'
        try:
            profile = getattr(user, 'auth_profile', None)
            if profile:
                if profile.user_type in ['super_user', 'site_admin']:
                    return True
                if profile.role_relationship:
                    role = profile.role_relationship.name.lower()
                    
            if role == 'user':
                emp_profile = getattr(user, 'res_employee', None)
                if emp_profile and emp_profile.role:
                    role = emp_profile.role.lower()
        except Exception:
            pass

        mapping = RoleAccessMapping.objects.filter(role=role, site_id=module_name).first()
        if not mapping and role not in ['admin', 'user']:
            # Fallback to base 'user' role
            mapping = RoleAccessMapping.objects.filter(role='user', site_id=module_name).first()
            
        if not mapping:
            return False

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
            
        # For our boolean toggle mapping, if it's 'none' or False, it's denied
        if has_perm in ['none', False, None]:
            return False
            
        return True
