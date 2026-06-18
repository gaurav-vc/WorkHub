from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrandSettingViewSet

router = DefaultRouter()
router.register(r'settings', BrandSettingViewSet, basename='brandsetting')

urlpatterns = [
    path('', include(router.urls)),
]