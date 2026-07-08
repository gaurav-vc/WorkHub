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

from rest_framework.permissions import IsAuthenticated

class SiteViewSet(viewsets.ModelViewSet):
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
            from django.core.mail import EmailMultiAlternatives
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

            # Send Welcome Email with HTML
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            display_name = user.get_full_name() or contact_email
            subject = f"Welcome to WorkHub – Your Site Admin Access for {site.site_name}"

            text_body = f"""Hello {display_name},

You have been assigned as the Site Admin for {site.site_name}.

Login URL   : {frontend_url}
Login ID    : {contact_email}
Password    : {temp_password}

Please log in and change your password immediately.

Best regards,
The WorkHub Team
"""

            html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px 40px 30px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">&#x2728; WorkHub</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">Enterprise Workspace Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;color:#1e1b4b;font-size:22px;">Welcome, {display_name}! &#x1F44B;</h2>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
              You have been assigned as the <strong>Site Admin</strong> for
              <strong style="color:#4f46e5;">{site.site_name}</strong>.
              Use the credentials below to access your dashboard.
            </p>

            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border:1px solid #e0e7ff;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Your Login Credentials</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">&#x1F310; Website</td>
                      <td style="padding:6px 0;">
                        <a href="{frontend_url}" style="color:#4f46e5;font-weight:600;font-size:14px;text-decoration:none;">{frontend_url}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#6b7280;font-size:14px;">&#x1F4E7; Login ID</td>
                      <td style="padding:6px 0;color:#111827;font-weight:600;font-size:14px;">{contact_email}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#6b7280;font-size:14px;">&#x1F512; Password</td>
                      <td style="padding:6px 0;">
                        <code style="background:#eef2ff;color:#4f46e5;padding:3px 10px;border-radius:5px;font-size:15px;font-weight:700;letter-spacing:1px;">{temp_password}</code>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#6b7280;font-size:14px;">&#x1F3E2; Site</td>
                      <td style="padding:6px 0;color:#111827;font-size:14px;">{site.site_name}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <a href="{frontend_url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                    Login to WorkHub &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:8px;">
              <tr>
                <td style="padding:14px 18px;color:#92400e;font-size:13px;line-height:1.5;">
                  &#x26A0;&#xFE0F; <strong>Important:</strong> This is a temporary password. Please change it immediately after your first login.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              &copy; 2025 WorkHub &bull; This email was sent because a site admin account was created for you.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

            try:
                email_msg = EmailMultiAlternatives(
                    subject=subject,
                    body=text_body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'gauravkokane420op@gmail.com'),
                    to=[contact_email],
                )
                email_msg.attach_alternative(html_body, "text/html")
                email_msg.send(fail_silently=False)
                print(f"Welcome email sent to site admin: {contact_email}")
            except Exception as e:
                print(f"Failed to send email to {contact_email}: {e}")

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
