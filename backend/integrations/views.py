from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import redirect
from django.conf import settings
import urllib.parse
import requests
from django.utils import timezone
from datetime import timedelta

from .models import Integration, MicrosoftCredentials, SyncedEmail
from .serializers import IntegrationSerializer

class IntegrationViewSet(viewsets.ModelViewSet):
    queryset = Integration.objects.all().order_by('name')

    def get_queryset(self):
        return Integration.objects.all().order_by('name')
    serializer_class = IntegrationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def microsoft_login(request):
    client_id = getattr(settings, 'AZURE_CLIENT_ID', None)
    if not client_id:
        return Response({"error": "Azure Client ID not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    redirect_uri = request.build_absolute_uri('/api/integrations/microsoft/callback/')
    # Force https if not localhost (or assume https from frontend, wait, if testing locally, it's http)
    if 'localhost' not in redirect_uri and '127.0.0.1' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')

    # Save user id in state to link account in callback
    state = request.user.id
    
    auth_url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&response_mode=query"
        f"&scope=offline_access%20User.Read%20Mail.Read%20Mail.ReadWrite"
        f"&state={state}"
    )
    return Response({"url": auth_url})

@api_view(['GET'])
@permission_classes([AllowAny])
def microsoft_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state') # This is the user_id
    
    if not code or not state:
        return Response({"error": "Missing code or state"}, status=status.HTTP_400_BAD_REQUEST)
        
    client_id = getattr(settings, 'AZURE_CLIENT_ID', None)
    client_secret = getattr(settings, 'AZURE_CLIENT_SECRET', None)
    
    redirect_uri = request.build_absolute_uri('/api/integrations/microsoft/callback/')
    if 'localhost' not in redirect_uri and '127.0.0.1' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')

    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    token_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    
    r = requests.post(token_url, data=token_data)
    if r.status_code == 200:
        token_response = r.json()
        access_token = token_response.get('access_token')
        refresh_token = token_response.get('refresh_token')
        expires_in = token_response.get('expires_in', 3600)
        
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        from authentication.models import User
        try:
            user = User.objects.get(id=state)
            MicrosoftCredentials.objects.update_or_create(
                user=user,
                defaults={
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'expires_at': expires_at,
                }
            )
            # Redirect to frontend Inbox
            frontend_url = "http://localhost:5173/inbox" if 'localhost' in redirect_uri or '127.0.0.1' in redirect_uri else "https://workhub.vibesandbox.live/inbox"
            return redirect(frontend_url)
        except User.DoesNotExist:
            return Response({"error": "Invalid state/user"}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(r.json(), status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_synced_emails(request):
    emails = SyncedEmail.objects.filter(user=request.user)
    data = []
    for e in emails:
        data.append({
            "id": e.message_id,
            "subject": e.subject,
            "body_preview": e.body_preview,
            "sender_name": e.sender_name,
            "sender_email": e.sender_email,
            "received_date": e.received_date,
            "is_read": e.is_read,
            "web_link": e.web_link,
        })
    return Response(data)