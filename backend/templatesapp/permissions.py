from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow administrators to edit or create templates.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Uses standard existing RBAC checking
        return request.user and (request.user.is_staff or getattr(getattr(request.user, 'auth_profile', None), 'role', '') == 'PM')