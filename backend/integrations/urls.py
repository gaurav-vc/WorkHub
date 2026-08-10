from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, microsoft_login, microsoft_callback, get_synced_emails, google_login, google_callback, get_connected_accounts

router = DefaultRouter()
router.register(r'items', IntegrationViewSet, basename='integration')

urlpatterns = [
    path('microsoft/login/', microsoft_login, name='microsoft_login'),
    path('microsoft/callback/', microsoft_callback, name='microsoft_callback'),
    path('google/login/', google_login, name='google_login'),
    path('google/callback/', google_callback, name='google_callback'),
    path('connected-accounts/', get_connected_accounts, name='connected_accounts'),
    path('emails/', get_synced_emails, name='synced_emails'),
    path('', include(router.urls)),
]