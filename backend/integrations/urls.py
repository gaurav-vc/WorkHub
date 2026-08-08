from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, microsoft_login, microsoft_callback, get_synced_emails

router = DefaultRouter()
router.register(r'items', IntegrationViewSet, basename='integration')

urlpatterns = [
    path('microsoft/login/', microsoft_login, name='microsoft_login'),
    path('microsoft/callback/', microsoft_callback, name='microsoft_callback'),
    path('emails/', get_synced_emails, name='synced_emails'),
    path('', include(router.urls)),
]