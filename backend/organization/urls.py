from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, SiteViewSet, PaymentViewSet, SuperAdminDashboardView

router = DefaultRouter()
router.register(r'management', OrganizationViewSet, basename='organization-management')
router.register(r'sites', SiteViewSet, basename='organization-sites')
router.register(r'payments', PaymentViewSet, basename='organization-payments')

urlpatterns = [
    path('superadmin/dashboard/', SuperAdminDashboardView.as_view(), name='superadmin-dashboard'),
    path('', include(router.urls)),
]
