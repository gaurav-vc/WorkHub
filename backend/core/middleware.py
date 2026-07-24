import threading

_thread_locals = threading.local()

def get_current_request():
    return getattr(_thread_locals, 'request', None)

def get_current_user():
    request = get_current_request()
    if request:
        return getattr(request, 'user', None)
    return None

class TenantMiddleware:
    """
    Middleware to store the current request in thread-local storage.
    This allows models and managers to access the current user for tenant filtering.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Explicitly authenticate JWT token so thread_locals has the actual user object
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                jwt_auth = JWTAuthentication()
                auth_result = jwt_auth.authenticate(request)
                if auth_result:
                    request.user, _ = auth_result
            except Exception:
                pass

        _thread_locals.request = request
        
        org_id = request.headers.get('X-Organization-ID')
        if org_id:
            _thread_locals.organization_id = org_id
            
        site_id = request.headers.get('X-Site-ID')
        if site_id:
            _thread_locals.site_id = site_id
        response = self.get_response(request)
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        if hasattr(_thread_locals, 'organization_id'):
            del _thread_locals.organization_id
        if hasattr(_thread_locals, 'site_id'):
            del _thread_locals.site_id
        return response
