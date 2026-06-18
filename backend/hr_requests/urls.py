from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HRRequestViewSet

router = DefaultRouter()
router.register(r'requests', HRRequestViewSet, basename='hr-request')

urlpatterns = [
    path('', include(router.urls)),
]