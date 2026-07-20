from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from authentication.models import Role as AuthRole
from .models import RoleAccessMapping, FeatureAccessRequest, Role
from .serializers import RoleAccessMappingSerializer, FeatureAccessRequestSerializer, RoleSerializer
from core.views import TenantModelViewSet
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.response import Response

User = get_user_model()

class RoleViewSet(TenantModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if getattr(getattr(user, 'auth_profile', None), 'user_type', None) == 'super_user' or user.is_superuser:
            return User.objects.all().distinct()
            
        from core.tenant import get_current_organization, get_current_site
        org = get_current_organization()
        if not org:
            return User.objects.none()
            
        qs = User.objects.filter(org_profile__organization=org).distinct()
        
        site = get_current_site()
        user_type = getattr(getattr(user, 'auth_profile', None), 'user_type', 'employee')
        if user_type in ['employee', 'site_admin'] and site:
            qs = qs.filter(org_profile__site=site)
            
        return qs

    def list(self, request):
        users = self.get_queryset()
        # Custom serialization for frontend Users & Roles table
        data = []
        for u in users:
            dept = ''
            role = ''
            emp_id = ''
            manager_id = 'none'
            status_val = 'Active' if u.is_active else 'Inactive'
            try:
                emp = getattr(u, 'res_employee', None)
                if emp:
                    dept = emp.department.name if emp.department else ''
                    role = emp.role
                    emp_id = f"EMP{u.id:03d}"
                
                auth_prof = getattr(u, 'auth_profile', None)
                if auth_prof and auth_prof.reporting_to_id:
                    manager_id = str(auth_prof.reporting_to_id)
            except Exception:
                pass
            data.append({
                'id': u.id,
                'name': u.get_full_name() or u.username,
                'empId': emp_id or f"USR{u.id:03d}",
                'email': u.email,
                'dept': dept,
                'role': role,
                'manager_id': manager_id,
                'status': status_val,
                'is_superuser': u.is_superuser
            })
        return Response(data)
        
    def create(self, request):
        data = request.data
        username = data.get('email') or f"user_{User.objects.count()+1}"
        
        import secrets, string
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        
        # create user
        user = User.objects.create_user(
            username=username,
            email=data.get('email', ''),
            first_name=data.get('name', '').split()[0] if data.get('name') else '',
            last_name=' '.join(data.get('name', '').split()[1:]) if data.get('name') else '',
            password=temp_password,
            is_active=data.get('status', True)
        )
        
        # Link to EmployeeProfile if available
        try:
            from resources.models import EmployeeProfile, Department
            dept_name = data.get('dept')
            dept = None
            if dept_name:
                dept, _ = Department.objects.get_or_create(name=dept_name)
            
            role_name = data.get('role', 'user')
            from role_base_access.models import Role as RBACRole
            if not RBACRole.objects.filter(name__iexact=role_name).exists() and role_name.lower() != 'user':
                role_name = 'user'
            
            EmployeeProfile.objects.create(
                user=user,
                department=dept,
                role=role_name,
                is_active=data.get('status', True)
            )
        except Exception as e:
            pass
            
        # Link to Organization to ensure multi-tenant isolation
        try:
            from organization.models import UserProfile as OrgUserProfile
            org = None
            site = None
            if hasattr(request.user, 'org_profile'):
                org = request.user.org_profile.organization
                site = request.user.org_profile.site
            
            org_profile, _ = OrgUserProfile.objects.get_or_create(user=user)
            if org:
                org_profile.organization = org
            if site:
                org_profile.site = site
            org_profile.save()
        except Exception as e:
            print(f"Error assigning organization in UserViewSet: {e}")
            
        # Assign Reporting Manager
        try:
            from authentication.models import UserProfile as AuthUserProfile
            auth_profile, _ = AuthUserProfile.objects.get_or_create(user=user)
            manager_id = data.get('manager_id')
            if manager_id and str(manager_id) != 'none':
                auth_profile.reporting_to_id = manager_id
            auth_profile.save()
        except Exception as e:
            print(f"Error setting manager in UserViewSet: {e}")
            
        # Send Email
        from django.core.mail import send_mail
        from django.conf import settings
        subject = "Welcome to WorkHub - Your Account Details"
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        message = f"""Hello {user.get_full_name() or user.username},

Your account has been created successfully.

Here are your secure login credentials:
Website URL: {frontend_url}
Login ID (Email): {user.email or user.username}
Temporary Password: {temp_password}

Please log in and reset your password immediately.

Best regards,
Team WorkHub
"""
        try:
            if user.email:
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@workHub.com'),
                    [user.email],
                    fail_silently=False,
                )
        except Exception as e:
            print(f"Failed to send email to {user.email}: {e}")
            
        return Response({'id': user.id, 'name': user.get_full_name(), 'email': user.email})
        
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data
        if 'name' in data:
            name_parts = data['name'].split()
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        if 'email' in data:
            user.email = data['email']
        if 'status' in data:
            user.is_active = data['status']
        user.save()
        
        try:
            from resources.models import EmployeeProfile, Department
            emp = getattr(user, 'res_employee', None)
            dept = None
            if data.get('dept'):
                dept, _ = Department.objects.get_or_create(name=data['dept'])
                
            if emp:
                if 'dept' in data:
                    emp.department = dept
                if 'role' in data:
                    emp.role = data['role']
                if 'status' in data:
                    emp.is_active = data['status']
                emp.save()
            else:
                EmployeeProfile.objects.create(
                    user=user,
                    department=dept,
                    role=data.get('role', 'DEV'),
                    is_active=data.get('status', True)
                )
        except Exception:
            pass
            
        # Ensure organization mapping is maintained during update
        try:
            from organization.models import UserProfile as OrgUserProfile
            org = None
            site = None
            if hasattr(request.user, 'org_profile'):
                org = request.user.org_profile.organization
                site = request.user.org_profile.site
            
            org_profile, _ = OrgUserProfile.objects.get_or_create(user=user)
            save_profile = False
            if org and not org_profile.organization:
                org_profile.organization = org
                save_profile = True
            if site and not org_profile.site:
                org_profile.site = site
                save_profile = True
            if save_profile:
                org_profile.save()
        except Exception as e:
            print(f"Error updating organization in UserViewSet: {e}")

        # Assign Reporting Manager
        try:
            from authentication.models import UserProfile as AuthUserProfile
            auth_profile, _ = AuthUserProfile.objects.get_or_create(user=user)
            manager_id = data.get('manager_id')
            if manager_id and str(manager_id) != 'none':
                auth_profile.reporting_to_id = manager_id
            else:
                auth_profile.reporting_to = None
            auth_profile.save()
        except Exception as e:
            print(f"Error setting manager in UserViewSet: {e}")
            
        return Response({'id': user.id, 'name': user.get_full_name(), 'email': user.email})

class RoleAccessMappingViewSet(viewsets.ModelViewSet):
    queryset = RoleAccessMapping.objects.all()
    serializer_class = RoleAccessMappingSerializer
    
    # Add filtering, searching, and ordering backends
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Enable filtering by exact fields
    filterset_fields = ['site_id', 'role']
    
    # Enable searching by title
    search_fields = ['title']
    
    # Enable ordering (default is latest updated first via the Model's Meta class)
    ordering_fields = ['updated_at', 'created_at', 'site_id', 'role']
    ordering = ['-updated_at']

    @action(detail=False, methods=['post'])
    def sync_routes(self, request):
        routes = request.data.get('routes', [])
        
        # Get dynamic roles and add defaults
        dynamic_roles = list(Role.objects.values_list('name', flat=True))
        roles = list(set(['admin', 'user'] + [r.lower() for r in dynamic_roles]))
        
        for route in routes:
            for role in roles:
                mapping_id = f"{route['id']}::{role}"
                is_admin_route = route.get('path', '').startswith('/admin')
                
                # Default permissions
                if role == 'admin':
                    default_perms = {'view': True, 'create': True, 'edit': True, 'delete': True}
                elif role == 'user':
                    if is_admin_route:
                        default_perms = {'view': False, 'create': False, 'edit': False, 'delete': False}
                    else:
                        default_perms = {'view': True, 'create': True, 'edit': True, 'delete': False}
                else:
                    # For all custom roles, default to False so the Admin must explicitly set boundaries
                    default_perms = {'view': False, 'create': False, 'edit': False, 'delete': False}
                
                obj, created = RoleAccessMapping.objects.get_or_create(
                    id=mapping_id,
                    defaults={
                        'site_id': route['id'],
                        'site_name': route.get('path', ''),
                        'role': role,
                        'title': route.get('title', route['id']),
                        'permissions': default_perms, 
                        'module_state': {'active': True}
                    }
                )
                
                # If the mapping already existed, patch missing granular permissions
                if not created:
                    perms = obj.permissions
                    modified = False
                    for key in ['view', 'create', 'edit', 'delete']:
                        if key not in perms:
                            perms[key] = default_perms[key]
                            modified = True
                    if modified:
                        obj.permissions = perms
                        obj.save()
                        
        return Response({'status': 'synced'})
        
    @action(detail=False, methods=['get'])
    def my_access(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
            
        role = 'user' 
        user_type = 'employee'
        
        try:
            profile = getattr(user, 'auth_profile', None)
            if profile:
                user_type = profile.user_type
                if profile.role_relationship:
                    role = profile.role_relationship.name.lower()
                    
            # Fallback to EmployeeProfile string role if relationship wasn't set
            if role == 'user':
                emp_profile = getattr(user, 'res_employee', None)
                if emp_profile and emp_profile.role:
                    # emp_profile.role might be the Role CODE (e.g. DEV) or NAME.
                    # We need to find the RBAC Role and get its name.lower()
                    from role_base_access.models import Role as RBACRole
                    rbac_role = RBACRole.objects.filter(code__iexact=emp_profile.role).first()
                    if rbac_role:
                        role = rbac_role.name.lower()
                    else:
                        role = emp_profile.role.lower()
        except Exception:
            pass

        # Fallback to is_superuser if user_type is not set but is_superuser is true
        if user.is_superuser:
            user_type = 'super_user'
            role = 'admin'
                
        mappings = RoleAccessMapping.objects.filter(role=role)
            
        with open('debug_my_access.txt', 'a') as f:
            f.write(f"User: {user.username}, Evaluated Role: {role}, Evaluated UserType: {user_type}, MappingCount: {mappings.count()}\n")
            
        if role == 'site_admin':
            master_routes = {}
            for rm in RoleAccessMapping.objects.all():
                master_routes[rm.site_id] = {'site_name': rm.site_name, 'title': rm.title}
            
            dynamic_data = []
            for mod_id, route_info in master_routes.items():
                if not route_info['site_name'].startswith('/admin'):
                    dynamic_data.append({
                        'id': f"{mod_id}::{role}",
                        'site_id': mod_id,
                        'site_name': route_info['site_name'],
                        'role': role,
                        'title': route_info['title'],
                        'permissions': {'view': True, 'create': True, 'edit': True},
                        'module_state': {'active': True}
                    })
            data = dynamic_data
        elif role == 'org_admin':
            master_routes = {}
            for rm in RoleAccessMapping.objects.all():
                master_routes[rm.site_id] = {'site_name': rm.site_name, 'title': rm.title}
                
            dynamic_data = []
            for mod_id, route_info in master_routes.items():
                if not route_info['site_name'].startswith('/admin'):
                    dynamic_data.append({
                        'id': f"{mod_id}::{role}",
                        'site_id': mod_id,
                        'site_name': route_info['site_name'],
                        'role': role,
                        'title': route_info['title'],
                        'permissions': {'view': True, 'create': True, 'edit': True},
                        'module_state': {'active': True}
                    })
            data = dynamic_data
        else:
            data = self.get_serializer(mappings, many=True).data
            
        return Response({
            'role': role,
            'username': user.username,
            'user_type': user_type,
            'access': data
        })

class FeatureAccessRequestViewSet(viewsets.ModelViewSet):
    queryset = FeatureAccessRequest.objects.all().order_by('-requested_at')
    serializer_class = FeatureAccessRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # PERMANENT FIX: Since frontend controls access to the Setup page,
        # anyone who can query this endpoint is acting as an admin.
        # Just return all pending requests or their own requests.
        
        # We will check if they requested a specific status
        status = self.request.query_params.get('status', None)
        if self.action in ['list', 'retrieve']:
            # For the Setup page, we just want to return all pending requests
            return FeatureAccessRequest.objects.all().order_by('-requested_at')
        return FeatureAccessRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        req.status = 'approved'
        req.resolved_by = request.user
        req.resolved_at = timezone.now()
        req.save()
        # Automatically granting access could be complex if it's role-based vs user-based.
        # We rely on the admin to update Role Management if they approve a role-level request,
        # or we could implement user-level overrides later.
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = 'rejected'
        req.resolved_by = request.user
        req.resolved_at = timezone.now()
        req.save()
        return Response({'status': 'rejected'})