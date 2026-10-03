from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IntegrationViewSet, microsoft_login, microsoft_callback, get_synced_emails, google_login, google_callback, get_connected_accounts, get_email_details, reply_email, send_contact_email

router = DefaultRouter()
router.register(r'items', IntegrationViewSet, basename='integration')

urlpatterns = [
    path('microsoft/login/', microsoft_login, name='microsoft_login'),
    path('microsoft/callback/', microsoft_callback, name='microsoft_callback'),
    path('google/login/', google_login, name='google_login'),
    path('google/callback/', google_callback, name='google_callback'),
    path('connected-accounts/', get_connected_accounts, name='connected_accounts'),
    path('emails/', get_synced_emails, name='synced_emails'),
    path('emails/send-contact-email/', send_contact_email, name='send_contact_email'),
    path('emails/<str:message_id>/', get_email_details, name='email_details'),
    path('emails/<str:message_id>/reply/', reply_email, name='reply_email'),
    path('', include(router.urls)),
]