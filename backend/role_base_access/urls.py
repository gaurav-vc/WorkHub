from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleAccessMappingViewSet, FeatureAccessRequestViewSet, RoleViewSet, UserViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'users', UserViewSet, basename='users')
router.register(r'role-access', RoleAccessMappingViewSet, basename='role-access')
router.register(r'access-requests', FeatureAccessRequestViewSet, basename='access-requests')

urlpatterns = [
    # This exposes /api/rbac/role-access/ automatically
    path('', include(router.urls)),
]