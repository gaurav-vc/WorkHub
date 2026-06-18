from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIAgentViewSet

router = DefaultRouter()
router.register(r'agents', AIAgentViewSet, basename='ai-agent')

urlpatterns = [
    path('', include(router.urls)),
]
