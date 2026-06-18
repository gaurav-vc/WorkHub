from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MOMViewSet, MOMPointViewSet

router = DefaultRouter()
router.register(r'moms', MOMViewSet, basename='mom')
router.register(r'mom-points', MOMPointViewSet, basename='mompoint')

urlpatterns = [
    path('', include(router.urls)),
]
