from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ai_assistant_agent

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
    path('ai/chat/', ai_assistant_agent, name='ai-chat'),
]
