from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Organization
from .serializers import OrganizationSerializer, PaymentSerializer

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to SuperAdmins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # Also allow Django superusers for emergency/console access
        if request.user.is_superuser:
            return True
        try:
            profile = getattr(request.user, 'auth_profile', None)
            return profile and profile.user_type == 'super_user'
        except Exception:
            return False
class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by('-created_at')
    serializer_class = OrganizationSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        org = serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        org = serializer.save()



from .models import Site
from .serializers import SiteSerializer

class SiteViewSet(viewsets.ModelViewSet):
    from rest_framework.permissions import IsAuthenticated
    queryset = Site.objects.all().order_by('-created_at')
    serializer_class = SiteSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]


    def get_queryset(self):
        queryset = super().get_queryset()
        org_id = self.request.query_params.get('organization_id', None)
        if org_id is not None:
            queryset = queryset.filter(organization_id=org_id)
        return queryset

    def perform_create(self, serializer):
        site = serializer.save(created_by=self.request.user)
        
        # Create user for contact_email and assign as site admin
        contact_email = site.contact_email
        if contact_email:
            from django.contrib.auth.models import User
            from .models import UserProfile
            import secrets, string
            from django.core.mail import send_mail
            from django.conf import settings
            
            user, created = User.objects.get_or_create(username=contact_email, defaults={
                'email': contact_email,
                'first_name': site.contact_name or '',
            })
            
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
            user.set_password(temp_password)
            user.save()
            
            # Assign Site Admin role
            from authentication.models import Role, UserProfile as AuthProfile
            site_admin_role, _ = Role.objects.get_or_create(name='site_admin')
            auth_profile, _ = AuthProfile.objects.get_or_create(user=user)
            auth_profile.role_relationship = site_admin_role
            auth_profile.user_type = 'site_admin'
            auth_profile.save()
            
            # Link to Site in UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.site = site
            profile.organization = site.organization
            if site.contact_phone:
                profile.phone_number = site.contact_phone
            profile.save()
            
            # Send Email
            subject = f"Welcome to {site.site_name} on Anti Gravity"
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            message = f"""Hello {user.get_full_name() or user.username},

You have been assigned as the Site Admin for {site.site_name}.

Here are your secure login credentials:
Website URL: {frontend_url}
Login ID: {user.username}
Temporary Password: {temp_password}

Please log in and reset your password immediately.

Best regards,
Anti Gravity Team
"""
            try:
                send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@antigravity.com'),
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Failed to send email to {user.email}: {e}")

from rest_framework.views import APIView
from django.db.models import Sum, Count
from django.contrib.auth.models import User
from .models import Payment

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        org_id = self.request.query_params.get('organization_id', None)
        if org_id is not None:
            queryset = queryset.filter(organization_id=org_id)
        return queryset

class SuperAdminDashboardView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_orgs = Organization.objects.count()
        active_orgs = Organization.objects.filter(status='active').count()
        total_sites = Site.objects.count()
        active_sites = Site.objects.filter(status='active').count()
        total_users = User.objects.count()
        
        # Revenue and payments from Payment model
        revenue = Payment.objects.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0
        pending_payments = Payment.objects.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0
        
        # We can also return recent activities or recently added orgs/sites
        recent_orgs = OrganizationSerializer(Organization.objects.order_by('-created_at')[:5], many=True).data
        recent_sites = SiteSerializer(Site.objects.order_by('-created_at')[:5], many=True).data

        # Aggregate data for the Area Chart (Company Wise Site)
        from django.db.models import Count
        company_sites = Organization.objects.annotate(site_count=Count('sites')).values('name', 'site_count')
        company_wise_sites = [{"name": item['name'], "value": item['site_count']} for item in company_sites]

        # Aggregate data for Today's Upsale (Recent Payments)
        recent_payments = Payment.objects.order_by('-created_at')[:6]
        todays_upsale = []
        for p in recent_payments:
            org = p.organization
            site_count = org.sites.count() if org else 0
            todays_upsale.append({
                "name": org.name if org else "Unknown",
                "sites": site_count,
                "amount": str(p.amount)
            })
            
        # Aggregate Module Wise Sites and Revenue
        # For simplicity, we extract all modules_access from Sites, and sum up sites per module.
        # Revenue per module is estimated by splitting the org's revenue across its modules.
        module_site_counts = {}
        module_revenue = {}
        
        all_sites = Site.objects.prefetch_related('organization__payments').all()
        for site in all_sites:
            modules = site.modules_access if isinstance(site.modules_access, list) else []
            # Calculate total revenue for the site's org
            org_revenue = sum(p.amount for p in site.organization.payments.filter(status='paid')) if site.organization else 0
            rev_per_module = org_revenue / max(1, len(modules)) if modules else 0
            
            for mod in modules:
                # Handle case where module might be an object instead of string
                mod_name = mod.get('name') if isinstance(mod, dict) else str(mod)
                if not mod_name: continue
                
                module_site_counts[mod_name] = module_site_counts.get(mod_name, 0) + 1
                module_revenue[mod_name] = module_revenue.get(mod_name, 0) + float(rev_per_module)
                
        # Format for frontend
        module_wise_sites_data = [{"name": k, "value": v} for k, v in module_site_counts.items()]
        module_wise_revenue_data = [{"name": k, "amount": round(v, 2)} for k, v in module_revenue.items()]

        return Response({
            "totalOrganizations": total_orgs,
            "activeOrganizations": active_orgs,
            "totalSites": total_sites,
            "activeSites": active_sites,
            "totalUsers": total_users,
            "revenue": revenue,
            "pendingPayments": pending_payments,
            "recentOrganizations": recent_orgs,
            "recentSites": recent_sites,
            "companyWiseSites": company_wise_sites,
            "todaysUpsale": todays_upsale,
            "moduleWiseSites": module_wise_sites_data,
            "moduleWiseRevenue": module_wise_revenue_data
        })
