from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'audit_logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('', include(router.urls)),
]