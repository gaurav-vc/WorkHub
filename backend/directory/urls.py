from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, BusinessCardViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'business-cards', BusinessCardViewSet, basename='businesscard')

urlpatterns = [
    path('', include(router.urls)),
]