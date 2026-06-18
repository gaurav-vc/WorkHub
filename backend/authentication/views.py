from django.shortcuts import render
from rest_framework import generics, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.mail import send_mail
from django.conf import settings
from .models import Role, OTPToken, UserProfile, Organization
from .serializers import RoleSerializer, OrganizationSerializer
from workspace.models import Notification
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.decorators import action

class IsCustomAdminUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        try:
            profile = getattr(user, 'auth_profile', None)
            if profile and profile.role_relationship:
                if profile.role_relationship.name.lower() != 'user':
                    return True
        except Exception:
            pass
        return False

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by('-created_at')
    serializer_class = OrganizationSerializer
    permission_classes = (IsAuthenticated,)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Manually check if user exists but is inactive to return a specific error
        username = attrs.get('username')
        user = User.objects.filter(username=username).first()
        if user and not user.is_active:
            raise serializers.ValidationError('Account Pending Admin Approval')
            
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['id'] = self.user.id
        
        # Return user_type
        user_type = 'employee'
        try:
            profile = getattr(self.user, 'auth_profile', None)
            if profile:
                user_type = profile.user_type
        except Exception:
            pass
            
        if self.user.is_superuser:
            user_type = 'super_user'
            
        data['user_type'] = user_type
        
        role = 'user'
        try:
            profile = getattr(self.user, 'auth_profile', None)
            if profile and profile.role_relationship:
                role = profile.role_relationship.name.lower()
            if role == 'user':
                emp_profile = getattr(self.user, 'res_employee', None)
                if emp_profile and emp_profile.role:
                    role = emp_profile.role.lower()
        except Exception:
            pass

        if self.user.is_superuser:
            role = 'admin'

        data['role'] = role
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        user.is_active = False # Require Admin Approval
        user.save()
        
        # Notify admins
        admins = User.objects.filter(is_superuser=True)
        if admins.exists():
            Notification.objects.create(
                title="New User Registration",
                message=f"User {username} ({email}) has registered and is pending approval.",
                type="alert"
            )

        return Response({'message': 'User registered successfully and is pending admin approval.'}, status=status.HTTP_201_CREATED)

class ForgotPasswordRequestView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
            
        user = User.objects.filter(email=email).first()
        if not user:
            # Return success even if user doesn't exist for security reasons
            return Response({'message': 'If an account with that email exists, an OTP has been sent.'})
            
        # Delete any existing tokens
        OTPToken.objects.filter(user=user).delete()
        
        token = OTPToken.objects.create(user=user)
        
        # Send Email
        try:
            send_mail(
                'Password Reset OTP',
                f'Your OTP for password reset is: {token.otp_code}. It expires in 15 minutes.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            
        return Response({'message': 'If an account with that email exists, an OTP has been sent.'})


class VerifyOTPView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'Invalid OTP'}, status=400)
            
        token = OTPToken.objects.filter(user=user, otp_code=otp).first()
        if not token or not token.is_valid():
            return Response({'error': 'Invalid or expired OTP'}, status=400)
            
        return Response({'message': 'OTP verified. Proceed to reset password.'})


class ResetPasswordView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('password')
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'Invalid request'}, status=400)
            
        token = OTPToken.objects.filter(user=user, otp_code=otp).first()
        if not token or not token.is_valid():
            return Response({'error': 'Invalid or expired OTP'}, status=400)
            
        try:
            validate_password(new_password)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
            
        user.set_password(new_password)
        user.save()
        token.delete()
        
        return Response({'message': 'Password reset successfully.'})


class PendingUsersView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    
    def get(self, request):
        users = User.objects.filter(is_active=False).values('id', 'username', 'email', 'date_joined')
        return Response(list(users))

class ApproveUserView(APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request, user_id):
        action = request.data.get('action') # 'approve' or 'decline'
        department_id = request.data.get('department_id')
        role_id = request.data.get('role_id')
        
        user = User.objects.filter(id=user_id, is_active=False).first()
        if not user:
            return Response({'error': 'User not found or already active'}, status=404)
            
        if action == 'approve':
            if not role_id:
                return Response({'error': 'role_id is required for approval'}, status=400)
                
            role = Role.objects.filter(id=role_id).first()
            if not role:
                return Response({'error': 'Invalid role'}, status=400)
                
            user.is_active = True
            user.save()
            
            # Link to Auth Role
            auth_profile, _ = UserProfile.objects.get_or_create(user=user)
            auth_profile.role_relationship = role
            auth_profile.save()
            
            # Optionally link to Resource Department if department_id provided
            if department_id:
                try:
                    from resources.models import Department, EmployeeProfile
                    department = Department.objects.filter(id=department_id).first()
                    if department:
                        emp_profile, _ = EmployeeProfile.objects.get_or_create(user=user)
                        emp_profile.department = department
                        emp_profile.save()
                except Exception:
                    pass  # Skip silently if resources app unavailable
            
            # Link to Organization
            try:
                from organization.models import UserProfile as OrgUserProfile
                org = None
                if hasattr(request.user, 'org_profile') and request.user.org_profile.organization:
                    org = request.user.org_profile.organization
                
                org_profile, _ = OrgUserProfile.objects.get_or_create(user=user)
                if org:
                    org_profile.organization = org
                    org_profile.save()
            except Exception as e:
                print(f"Error assigning organization: {e}")
            
            return Response({'message': f'User {user.username} approved.'})
        elif action == 'decline':
            user.delete()
            return Response({'message': f'User {user.username} declined and removed.'})
        else:
            return Response({'error': 'Invalid action'}, status=400)


class EmployeeDepartmentView(APIView):
    """List all active users with their assigned department."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        qs = User.objects.filter(is_active=True).exclude(is_superuser=True).select_related('auth_profile__role_relationship')
        
        # If not superuser, filter by the same organization
        if not user.is_superuser:
            try:
                # organization profile is in user.org_profile
                org = user.org_profile.organization
                if org:
                    qs = qs.filter(org_profile__organization=org)
                else:
                    # If they don't belong to any organization, show none or only themselves
                    qs = qs.filter(id=user.id)
            except Exception:
                pass
                
        users = qs
        result = []
        for u in users:
            profile = getattr(u, 'auth_profile', None)
            dept = None
            dept_id = None
            reporting_to_id = None
            reporting_to_name = None
            if profile:
                if profile.role_relationship:
                    dept = profile.role_relationship.name
                    dept_id = profile.role_relationship.id
                if profile.reporting_to:
                    reporting_to_id = profile.reporting_to.id
                    reporting_to_name = profile.reporting_to.get_full_name() or profile.reporting_to.username
            if not dept:
                emp_profile = getattr(u, 'res_employee', None)
                if emp_profile and emp_profile.role:
                    dept = emp_profile.role

            org_name = None
            try:
                org_profile = getattr(u, 'org_profile', None)
                if org_profile and org_profile.organization:
                    org_name = org_profile.organization.name
            except Exception:
                pass

            result.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'full_name': u.get_full_name() or u.username,
                'department': dept,
                'department_id': dept_id,
                'reporting_to_id': reporting_to_id,
                'reporting_to_name': reporting_to_name,
                'organization_name': org_name,
            })
        return Response(result)


class AssignDepartmentView(APIView):
    """Assign one or more users to a department (role)."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        role_id = request.data.get('department_id')
        user_ids = request.data.get('user_ids', [])

        if not role_id:
            return Response({'error': 'department_id is required'}, status=400)

        from role_base_access.models import Role as RBACRole
        rbac_role = RBACRole.objects.filter(id=role_id).first()
        if not rbac_role:
            return Response({'error': 'Department not found in RBAC'}, status=404)
            
        role, _ = Role.objects.get_or_create(name=rbac_role.name)

        updated = []
        for uid in user_ids:
            user = User.objects.filter(id=uid).first()
            if not user:
                continue
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role_relationship = role
            profile.save()
            updated.append(user.username)

        return Response({'assigned': updated, 'department': role.name})


class AssignManagerView(APIView):
    """Assign a reporting manager to an employee."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user_id = request.data.get('user_id')
        manager_id = request.data.get('manager_id')

        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'Employee not found'}, status=404)

        manager = None
        if manager_id and manager_id != 'none':
            manager = User.objects.filter(id=manager_id).first()
            if not manager:
                return Response({'error': 'Manager not found'}, status=404)
            if manager.id == user.id:
                return Response({'error': 'Cannot report to self'}, status=400)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.reporting_to = manager
        profile.save()

        manager_name = manager.get_full_name() or manager.username if manager else "None"
        return Response({'message': f'Manager assigned to {user.username}', 'manager': manager_name})


class RemoveFromDepartmentView(APIView):
    """Remove a user from their department."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'User not found'}, status=404)
        profile = getattr(user, 'auth_profile', None)
        if profile:
            profile.role_relationship = None
            profile.save()
        return Response({'message': f'{user.username} removed from department'})


class CreateActiveUserView(APIView):
    """Admin endpoint to create a fully active user and optionally assign to department"""
    permission_classes = (IsAuthenticated,)  # Normally IsAdminUser, but using IsAuthenticated based on setup

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        full_name = request.data.get('full_name', '')
        department_id = request.data.get('department_id')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        first_name = ''
        last_name = ''
        if full_name:
            parts = full_name.split(' ', 1)
            first_name = parts[0]
            if len(parts) > 1:
                last_name = parts[1]

        user = User.objects.create_user(
            username=username, 
            email=email, 
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        user.is_active = True
        user.save()
        
        # Link to Auth Role
        if department_id:
            role = Role.objects.filter(id=department_id).first()
            if role:
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.role_relationship = role
                profile.save()

        # Link to Organization
        # Also need to link it in organization.UserProfile
        try:
            from organization.models import UserProfile as OrgUserProfile
            # Check if current user is part of an organization
            org = None
            if hasattr(request.user, 'org_profile') and request.user.org_profile.organization:
                org = request.user.org_profile.organization
            
            org_profile, _ = OrgUserProfile.objects.get_or_create(user=user)
            if org:
                org_profile.organization = org
                org_profile.save()
        except Exception as e:
            print(f"Error assigning organization: {e}")

        return Response({'message': 'User created successfully.', 'user_id': user.id}, status=status.HTTP_201_CREATED)


class CreateAdminView(APIView):
    """Superuser-only endpoint to create a staff (admin) user and optionally link to a department."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can create admin accounts.'}, status=status.HTTP_403_FORBIDDEN)

        full_name = request.data.get('full_name', '').strip()
        email = request.data.get('email', '').strip()
        department_id = request.data.get('department_id')

        if not full_name or not email:
            return Response({'error': 'Full name and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-generate username from email
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Auto-generate a strong temporary password
        import secrets, string
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        parts = full_name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

        user = User.objects.create_user(
            username=username,
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
        )
        user.is_active = True
        user.is_staff = True  # Grant admin access
        user.save()

        if department_id:
            role = Role.objects.filter(id=department_id).first()
            if role:
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.role_relationship = role
                profile.save()

        # Send Email
        from django.core.mail import send_mail
        from django.conf import settings
        subject = "Welcome to Anti Gravity - Admin Account Details"
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        message = f"""Hello {user.get_full_name() or user.username},

Your Administrator account has been created successfully.

Here are your secure login credentials:
Website URL: {frontend_url}
Login ID (Email): {user.email or user.username}
Temporary Password: {temp_password}

Please log in and reset your password immediately.

Best regards,
Anti Gravity Team
"""
        try:
            if user.email:
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@antigravity.com'),
                    [user.email],
                    fail_silently=True,
                )
        except Exception as e:
            print(f"Failed to send email to {user.email}: {e}")

        return Response({
            'message': f'Admin "{full_name}" created successfully.',
            'username': username,
            'temp_password': temp_password,
        }, status=status.HTTP_201_CREATED)

from rest_framework.decorators import api_view

@api_view(['GET'])
def get_leaderboard(request):
    profiles = UserProfile.objects.select_related('user').order_by('-points')[:50]
    data = []
    for p in profiles:
        data.append({
            "id": p.user.id,
            "name": p.user.get_full_name() or p.user.username,
            "role": p.get_role_display(),
            "initials": p.avatar_initials,
            "points": p.points,
            "level": p.level,
            "badges": p.badges
        })
    return Response(data)
