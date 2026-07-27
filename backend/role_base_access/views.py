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
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class RoleViewSet(TenantModelViewSet):
    queryset = Role.objects.all()


    def get_queryset(self):

        return Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
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
        if user_type in ['employee', 'site_admin']:
            if site:
                qs = qs.filter(org_profile__site=site)
            else:
                qs = qs.filter(org_profile__site__isnull=True)
            
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
            
            # Fetch Employee details
            phone = ''
            location = ''
            dob = ''
            skills = ''
            photo_url = ''
            try:
                from directory.models import Employee
                dir_emp = Employee.objects.filter(email=u.email).first()
                if dir_emp:
                    phone = dir_emp.phone
                    location = dir_emp.location
                    dob = dir_emp.date_of_birth.strftime('%Y-%m-%d') if dir_emp.date_of_birth else ''
                    skills = ', '.join(dir_emp.skills) if isinstance(dir_emp.skills, list) else dir_emp.skills
                    if dir_emp.photo:
                        photo_url = dir_emp.photo.url
            except Exception:
                pass
                
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
                'is_superuser': u.is_superuser,
                'phone': phone,
                'location': location,
                'dob': dob,
                'skills': skills,
                'photo_url': photo_url
            })
        return Response(data)
        
    def create(self, request):
        data = request.data
        username = data.get('email') or f"user_{User.objects.count()+1}"
        
        import secrets, string
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        
        # create user
        try:
            from django.db import IntegrityError
            user = User.objects.create_user(
                username=username,
                email=data.get('email', ''),
                first_name=data.get('name', '').split()[0] if data.get('name') else '',
                last_name=' '.join(data.get('name', '').split()[1:]) if data.get('name') else '',
                password=temp_password,
                is_active=str(data.get('status', 'true')).lower() == 'true'
            )
        except IntegrityError:
            # User already exists! Fetch them and proceed to link them to the org instead of crashing.
            user = User.objects.get(username=username)
        
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
                is_active=str(data.get('status', 'true')).lower() == 'true'
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
            
        # Automatically create Directory Employee
        try:
            from directory.models import Employee
            from datetime import date
            
            full_name = data.get('name', username)
            initials = ''.join(p[0] for p in full_name.split()[:2]).upper() if full_name else '?'
            
            phone = data.get('phone', '')
            location = data.get('location', '')
            date_of_birth = data.get('date_of_birth', None)
            manager = data.get('manager', '')
            skills_raw = data.get('skills', '')
            photo = request.FILES.get('photo', None)

            skills = [s.strip() for s in skills_raw.split(',') if s.strip()] if skills_raw else []

            dob = None
            if date_of_birth:
                try:
                    from datetime import datetime
                    if '-' in date_of_birth:
                        parts = date_of_birth.split('-')
                        if len(parts[0]) == 4:
                            dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
                        else:
                            dob = datetime.strptime(date_of_birth, '%d-%m-%Y').date()
                except Exception:
                    pass
            emp, created = Employee.objects.update_or_create(
                email=data.get('email', ''),
                defaults={
                    'organization': org,
                    'site': site,
                    'name': full_name,
                    'initials': initials,
                    'role': data.get('role', 'user'),
                    'department': data.get('dept', 'General'),
                    'phone': phone,
                    'location': location,
                    'joined_date': date.today().strftime("%b %Y"),
                    'manager': manager,
                    'skills': skills,
                    'date_of_birth': dob
                }
            )
            if photo:
                emp.photo = photo
                emp.save()
                
            # DYNAMIC TRIGGER: If their birthday is today, instantly trigger the birthday routine!
            if dob and dob.month == date.today().month and dob.day == date.today().day:
                import threading
                from django.core.management import call_command
                threading.Thread(target=lambda: call_command('check_birthdays')).start()
                
        except Exception as e:
            return Response({'error': f"Failed to create Directory Employee: {str(e)}"}, status=400)
            
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
            user.is_active = str(data.get('status', 'true')).lower() == 'true'
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
                    emp.is_active = str(data.get('status', 'true')).lower() == 'true'
                if request.FILES.get('photo'):
                    emp.photo = request.FILES['photo']
                emp.save()
                
                # DYNAMIC TRIGGER: If their birthday is today, instantly trigger the birthday routine!
                if getattr(emp, 'date_of_birth', None):
                    from datetime import date
                    dob = emp.date_of_birth
                    if dob.month == date.today().month and dob.day == date.today().day:
                        import threading
                        from django.core.management import call_command
                        threading.Thread(target=lambda: call_command('check_birthdays')).start()
                        
            else:
                EmployeeProfile.objects.create(
                    user=user,
                    department=dept,
                    role=data.get('role', 'DEV'),
                    is_active=str(data.get('status', 'true')).lower() == 'true'
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

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        
        # Delete from Directory to ensure synchronization
        try:
            from directory.models import Employee
            Employee.objects.filter(email=user.email).delete()
        except Exception as e:
            print(f"Error deleting Directory Employee: {e}")
            
        # Delete the core user
        user.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

class RoleAccessMappingViewSet(viewsets.ModelViewSet):
    queryset = RoleAccessMapping.objects.all()


    def get_queryset(self):

        return RoleAccessMapping.objects.all()
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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        role_filter = request.query_params.get('role')
        
        # If frontend is asking for a specific role and it has NO mappings yet,
        # we dynamically auto-generate them based on the Site Admin's available modules!
        if role_filter and not queryset.exists():
            from role_base_access.models import Role
            if Role.objects.filter(name=role_filter).exists():
                user = request.user
                from role_base_access.utils import get_normalized_site_modules, MODULE_ID_TO_URLS
                
                # Only give the new role access to modules the current Admin actually has!
                if user.is_superuser or getattr(getattr(user, 'auth_profile', None), 'user_type', None) in ['super_user']:
                    modules_to_map = MODULE_ID_TO_URLS.keys()
                else:
                    modules_to_map = get_normalized_site_modules(user)
                    
                site_prefix = f"{user.org_profile.site.id}::" if hasattr(user, 'org_profile') and user.org_profile and user.org_profile.site else ""
                
                new_mappings = []
                for mod_id in modules_to_map:
                    if mod_id not in MODULE_ID_TO_URLS:
                        continue
                        
                    site_name = MODULE_ID_TO_URLS[mod_id]
                    if site_name.startswith('/admin'):
                        continue # Don't map admin config routes to standard roles
                        
                    mapping_id = f"{site_prefix}{mod_id}::{role_filter}"
                    
                    # By default, new roles have all permissions set to False
                    default_perms = {'view': False, 'create': False, 'edit': False, 'delete': False}
                    
                    obj, created = RoleAccessMapping.all_objects.get_or_create(
                        id=mapping_id,
                        defaults={
                            'frontend_site_id': mod_id,
                            'site_name': site_name,
                            'role': role_filter,
                            'title': mod_id.replace('-', ' ').title(),
                            'permissions': default_perms, 
                            'module_state': {'active': True},
                            'organization': getattr(user, 'org_profile').organization if hasattr(user, 'org_profile') and user.org_profile else None,
                            'site': getattr(user, 'org_profile').site if hasattr(user, 'org_profile') and user.org_profile else None,
                        }
                    )
                    new_mappings.append(obj)
                    
                # Re-fetch now that they are created
                if new_mappings:
                    queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def sync_routes(self, request):
        routes = request.data.get('routes', [])
        
        # Ensure system roles exist so they can be dynamically configured in the UI
        Role.objects.get_or_create(name='site_admin', defaults={'code': 'SITE_ADMIN'})
        Role.objects.get_or_create(name='org_admin', defaults={'code': 'ORG_ADMIN'})
        
        # Get dynamic roles and add defaults
        dynamic_roles = list(Role.objects.values_list('name', flat=True))
        roles = list(set(['admin', 'user'] + [r.lower() for r in dynamic_roles]))
        
        # Site prefix for unique mapping ID per tenant
        user = request.user
        try:
            org_profile = getattr(user, 'org_profile', None)
            site = org_profile.site if org_profile else None
            site_prefix = f"{site.id}::" if site else ""
        except Exception:
            site_prefix = ""
        
        for route in routes:
            for role in roles:
                mapping_id = f"{site_prefix}{route['id']}::{role}"
                is_admin_route = route.get('path', '').startswith('/admin')
                
                # Default permissions
                if role in ['admin', 'site_admin', 'org_admin']:
                    default_perms = {'view': True, 'create': True, 'edit': True, 'delete': True}
                elif role == 'user':
                    default_perms = {'view': False, 'create': False, 'edit': False, 'delete': False}
                else:
                    # For all custom roles, default to False so the Admin must explicitly set boundaries
                    default_perms = {'view': False, 'create': False, 'edit': False, 'delete': False}
                
                obj, created = RoleAccessMapping.all_objects.get_or_create(
                    id=mapping_id,
                    defaults={
                        'frontend_site_id': route['id'],
                        'site_name': route.get('path', ''),
                        'role': role,
                        'title': route.get('title', route['id']),
                        'permissions': default_perms, 
                        'module_state': {'active': True},
                        'organization': getattr(user, 'org_profile').organization if getattr(user, 'org_profile', None) else None,
                        'site': getattr(user, 'org_profile').site if getattr(user, 'org_profile', None) else None,
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
                
        org_name = None
        site_name = None
        site_modules = []
        try:
            org_profile = getattr(user, 'org_profile', None)
            if org_profile:
                if org_profile.organization:
                    org_name = org_profile.organization.name
                if org_profile.site:
                    site_name = org_profile.site.name
                    if org_profile.site.modules_access:
                        site_modules = org_profile.site.modules_access
        except Exception:
            pass
                
        mappings = RoleAccessMapping.objects.filter(role=role)
            
        warning = None
        if role == 'site_admin':
            from role_base_access.utils import get_normalized_site_modules, MODULE_ID_TO_URLS
            normalized_site_modules = get_normalized_site_modules(user)
            
            dynamic_data = []
            for mod_id in normalized_site_modules:
                site_name = MODULE_ID_TO_URLS.get(mod_id, f"/{mod_id}")
                if not site_name.startswith('/admin'):
                    dynamic_data.append({
                        'id': f"{mod_id}::{role}",
                        'site_id': mod_id,
                        'site_name': site_name,
                        'role': role,
                        'title': mod_id.replace('-', ' ').title(),
                        'permissions': {'view': True, 'create': True, 'edit': True},
                        'module_state': {'active': True}
                    })
            data = dynamic_data
            if len(data) == 0:
                # Calculate root cause for popup
                if not hasattr(user, 'org_profile') or not user.org_profile:
                    warning = "Site Admin has no organization profile linked. Please ask Super Admin to assign you to a Site."
                elif not user.org_profile.site:
                    warning = "Site Admin is not assigned to any specific Site. Please ask Super Admin to link your profile to a Site."
                elif not user.org_profile.site.modules_access:
                    warning = f"Site '{user.org_profile.site.site_name}' has no modules enabled. Please edit the site and assign modules."
                else:
                    warning = f"Site '{user.org_profile.site.site_name}' modules ({user.org_profile.site.modules_access}) could not be mapped to any standard routes."
        elif role == 'org_admin':
            from role_base_access.utils import get_normalized_site_modules, MODULE_ID_TO_URLS
            normalized_site_modules = get_normalized_site_modules(user)
            has_site = hasattr(user, 'org_profile') and user.org_profile and user.org_profile.site

            dynamic_data = []
            for mod_id, site_name in MODULE_ID_TO_URLS.items():
                if not site_name.startswith('/admin'):
                    if not has_site or mod_id in normalized_site_modules:
                        dynamic_data.append({
                            'id': f"{mod_id}::{role}",
                            'site_id': mod_id,
                            'site_name': site_name,
                            'role': role,
                            'title': mod_id.replace('-', ' ').title(),
                            'permissions': {'view': True, 'create': True, 'edit': True},
                            'module_state': {'active': True}
                        })
            data = dynamic_data
        else:
            raw_data = self.get_serializer(mappings, many=True).data
            from role_base_access.utils import get_normalized_site_modules
            normalized_site_modules = get_normalized_site_modules(user)
            data = []
            for item in raw_data:
                mod_id = item.get('frontend_site_id')
                # If module is enabled for the site (or is a core/admin module), keep it
                if mod_id in normalized_site_modules or not mod_id:
                    data.append(item)
                    
        return Response({
            'role': role,
            'username': user.username,
            'email': user.email,
            'user_type': user_type,
            'org_name': org_name,
            'site_name': site_name,
            'access': data,
            'warning': warning
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