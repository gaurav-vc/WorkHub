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
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from .models import Integration, MicrosoftCredentials, EmailAccount, SyncedEmail
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
    if 'localhost' not in redirect_uri and '127.0.0.1' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')

    frontend_base = request.headers.get('Origin')
    if not frontend_base:
        referer = request.headers.get('Referer')
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            frontend_base = f"{parsed.scheme}://{parsed.netloc}"
    if not frontend_base:
        frontend_base = "http://localhost:8080" if 'localhost' in redirect_uri or '127.0.0.1' in redirect_uri else "https://workhub.vibesandbox.live"
        
    state = f"{request.user.id}|{frontend_base}"
    
    auth_url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&response_mode=query"
        f"&scope=offline_access%20User.Read%20Mail.Read%20Mail.ReadWrite"
        f"&state={urllib.parse.quote(state)}"
    )
    return Response({"url": auth_url})

@api_view(['GET'])
@permission_classes([AllowAny])
def microsoft_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    
    if not code or not state:
        return Response({"error": "Missing code or state"}, status=status.HTTP_400_BAD_REQUEST)
        
    state = urllib.parse.unquote(state)
    state_parts = state.split('|')
    user_id = state_parts[0]
    frontend_base = state_parts[1] if len(state_parts) > 1 else ("http://localhost:5173" if 'localhost' in request.build_absolute_uri() else "https://workhub.vibesandbox.live")
        
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
            user = User.objects.get(id=user_id)
            
            # Get user profile email from MS Graph to save in EmailAccount
            headers = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
            profile_res = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
            account_email = user.email # fallback
            if profile_res.status_code == 200:
                account_email = profile_res.json().get('userPrincipalName', user.email)
            
            # Use tenant context to ensure the record belongs to the user's organization and site
            org_id = None
            site_id = None
            if hasattr(user, 'org_profile'):
                org_id = user.org_profile.organization_id
                site_id = user.org_profile.site_id
                
            from core.tenant import tenant_context
            with tenant_context(organization_id=org_id, site_id=site_id):
                # Check limit
                if EmailAccount.objects.filter(user=user).count() >= 15:
                    # Silently ignore or we could return error, but it's a callback so redirect is better
                    pass
                else:
                    EmailAccount.objects.update_or_create(
                        user=user,
                        provider='microsoft',
                        account_email=account_email,
                        defaults={
                            'access_token': access_token,
                            'refresh_token': refresh_token,
                            'expires_at': expires_at,
                        }
                    )
            
            return redirect(f"{frontend_base}/inbox")
        except User.DoesNotExist:
            return Response({"error": "Invalid state/user"}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(r.json(), status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_login(request):
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    if not client_id:
        return Response({"error": "Google Client ID not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    redirect_uri = request.build_absolute_uri('/api/integrations/google/callback/')
    if 'localhost' not in redirect_uri and '127.0.0.1' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')

    frontend_base = request.headers.get('Origin')
    if not frontend_base:
        referer = request.headers.get('Referer')
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            frontend_base = f"{parsed.scheme}://{parsed.netloc}"
    if not frontend_base:
        frontend_base = "http://localhost:5173" if 'localhost' in redirect_uri or '127.0.0.1' in redirect_uri else "https://workhub.vibesandbox.live"
        
    state = f"{request.user.id}|{frontend_base}"
    
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.modify%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/calendar.events"
        f"&state={urllib.parse.quote(state)}"
    )
    return Response({"url": auth_url})

@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    
    if not code or not state:
        return Response({"error": "Missing code or state"}, status=status.HTTP_400_BAD_REQUEST)
        
    state = urllib.parse.unquote(state)
    state_parts = state.split('|')
    user_id = state_parts[0]
    frontend_base = state_parts[1] if len(state_parts) > 1 else ("http://localhost:5173" if 'localhost' in request.build_absolute_uri() else "https://workhub.vibesandbox.live")
        
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
    
    redirect_uri = request.build_absolute_uri('/api/integrations/google/callback/')
    if 'localhost' not in redirect_uri and '127.0.0.1' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')

    token_url = "https://oauth2.googleapis.com/token"
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
        refresh_token = token_response.get('refresh_token', '') # Google only sends refresh token on first auth unless prompt=consent
        expires_in = token_response.get('expires_in', 3600)
        
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        from authentication.models import User
        try:
            user = User.objects.get(id=user_id)
            
            # Fetch user email from Google
            headers = {'Authorization': f'Bearer {access_token}'}
            profile_res = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers=headers)
            account_email = user.email # fallback
            if profile_res.status_code == 200:
                account_email = profile_res.json().get('email', user.email)
            
            # Use tenant context to ensure the record belongs to the user's organization and site
            org_id = None
            site_id = None
            if hasattr(user, 'org_profile'):
                org_id = user.org_profile.organization_id
                site_id = user.org_profile.site_id
                
            from core.tenant import tenant_context
            with tenant_context(organization_id=org_id, site_id=site_id):
                # Check limit
                if EmailAccount.objects.filter(user=user).count() >= 15:
                    pass
                else:
                    account, created = EmailAccount.objects.update_or_create(
                        user=user,
                        provider='google',
                        account_email=account_email,
                        defaults={
                            'access_token': access_token,
                            'expires_at': expires_at,
                        }
                    )
                    if refresh_token:
                        account.refresh_token = refresh_token
                        account.save()
            
            return redirect(f"{frontend_base}/inbox")
        except User.DoesNotExist:
            return Response({"error": "Invalid state/user"}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(r.json(), status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_accounts(request):
    accounts = EmailAccount.objects.filter(user=request.user)
    data = []
    for acc in accounts:
        data.append({
            "id": acc.id,
            "provider": acc.provider,
            "account_email": acc.account_email,
            "is_active": acc.is_active
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_synced_emails(request):
    from .tasks import sync_all_emails
    
    account_id = request.GET.get('account_id')
    
    # Sync dynamically based on user request as per requirement
    if account_id:
        try:
            account = EmailAccount.objects.get(id=account_id, user=request.user)
            sync_all_emails(specific_account_id=account.id)
            emails = SyncedEmail.objects.filter(user=request.user, account=account)
        except EmailAccount.DoesNotExist:
            emails = SyncedEmail.objects.none()
    else:
        sync_all_emails(user_id=request.user.id)
        emails = SyncedEmail.objects.filter(user=request.user)
        
    data = []
    for e in emails:
        data.append({
            "id": e.message_id,
            "account_id": e.account_id,
            "subject": e.subject,
            "body_preview": e.body_preview,
            "sender_name": e.sender_name,
            "sender_email": e.sender_email,
            "received_date": e.received_date,
            "is_read": e.is_read,
            "web_link": e.web_link,
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_email_details(request, message_id):
    try:
        # Assuming the email is in SyncedEmail to get the account ID
        synced = SyncedEmail.objects.get(message_id=message_id, user=request.user)
        account = synced.account
        
        if account.provider != 'google':
            return Response({"error": "Only Google accounts are supported for native viewing right now"}, status=status.HTTP_400_BAD_REQUEST)
            
        headers = {'Authorization': f'Bearer {account.access_token}', 'Accept': 'application/json'}
        res = requests.get(f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}?format=full', headers=headers)
        
        if res.status_code == 401: # Token expired handling logic would go here in a production app
            return Response({"error": "Token expired, please reconnect your account"}, status=status.HTTP_401_UNAUTHORIZED)
            
        if res.status_code != 200:
            return Response(res.json(), status=res.status_code)
            
        msg_data = res.json()
        
        # Parse payload
        payload = msg_data.get('payload', {})
        headers_list = payload.get('headers', [])
        
        # Extract threading headers
        subject = next((h['value'] for h in headers_list if h['name'].lower() == 'subject'), '')
        msg_id_header = next((h['value'] for h in headers_list if h['name'].lower() == 'message-id'), '')
        references = next((h['value'] for h in headers_list if h['name'].lower() == 'references'), '')
        from_header = next((h['value'] for h in headers_list if h['name'].lower() == 'from'), '')
        to_header = next((h['value'] for h in headers_list if h['name'].lower() == 'to'), '')
        
        # Mark as read
        if 'UNREAD' in msg_data.get('labelIds', []):
            requests.post(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify',
                headers=headers,
                json={"removeLabelIds": ["UNREAD"]}
            )
            synced.is_read = True
            synced.save()
            
        # Decode body
        def decode_part(part):
            data = part.get('body', {}).get('data', '')
            if data:
                return base64.urlsafe_b64decode(data + '=' * (-len(data) % 4)).decode('utf-8', errors='replace')
            return ''

        html_body = ""
        text_body = ""

        def find_parts(parts):
            nonlocal html_body, text_body
            for part in parts:
                mime_type = part.get('mimeType')
                if mime_type == 'text/html':
                    html_body = decode_part(part)
                elif mime_type == 'text/plain':
                    text_body = decode_part(part)
                if 'parts' in part:
                    find_parts(part['parts'])

        if 'parts' in payload:
            find_parts(payload['parts'])
        else:
            if payload.get('mimeType') == 'text/html':
                html_body = decode_part(payload)
            else:
                text_body = decode_part(payload)

        return Response({
            "id": message_id,
            "subject": subject,
            "from": from_header,
            "to": to_header,
            "html_body": html_body or text_body,
            "text_body": text_body,
            "message_id_header": msg_id_header,
            "references": references,
            "thread_id": msg_data.get('threadId')
        })
    except SyncedEmail.DoesNotExist:
        return Response({"error": "Email not found in synced inbox"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reply_email(request, message_id):
    try:
        synced = SyncedEmail.objects.get(message_id=message_id, user=request.user)
        account = synced.account
        reply_html = request.data.get('body')
        
        if not reply_html:
            return Response({"error": "Reply body is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get original headers from our endpoint logic or frontend
        msg_id_header = request.data.get('message_id_header')
        references = request.data.get('references')
        original_subject = request.data.get('subject')
        to_address = request.data.get('to') # Note: this should actually be the 'From' of the original
        
        # Create MIME Message
        message = MIMEMultipart()
        message['To'] = to_address
        message['Subject'] = original_subject if original_subject.lower().startswith('re:') else f"Re: {original_subject}"
        message['In-Reply-To'] = msg_id_header
        
        if references:
            message['References'] = f"{references} {msg_id_header}"
        else:
            message['References'] = msg_id_header
            
        msg_text = MIMEText(reply_html, 'html')
        message.attach(msg_text)
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        headers = {'Authorization': f'Bearer {account.access_token}', 'Content-Type': 'application/json'}
        payload = {
            "raw": raw_message,
            "threadId": request.data.get('thread_id')
        }
        
        res = requests.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', headers=headers, json=payload)
        
        if res.status_code == 200:
            return Response({"success": True, "message": "Reply sent successfully"})
        return Response(res.json(), status=res.status_code)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_contact_email(request):
    try:
        account = EmailAccount.objects.filter(user=request.user, provider='google').first()
        if not account:
            return Response({"error": "No connected Google account found."}, status=status.HTTP_400_BAD_REQUEST)
            
        subject = request.data.get('subject')
        body = request.data.get('body')
        to_address = request.data.get('to')
        
        if not all([subject, body, to_address]):
            return Response({"error": "Subject, body, and to_address are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        message = MIMEMultipart()
        message['To'] = to_address
        message['Subject'] = subject
        
        msg_text = MIMEText(body, 'html')
        message.attach(msg_text)
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        headers = {'Authorization': f'Bearer {account.access_token}', 'Content-Type': 'application/json'}
        payload = {
            "raw": raw_message
        }
        
        res = requests.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', headers=headers, json=payload)
        
        if res.status_code == 200:
            return Response({"success": True, "message": "Email sent successfully"})
        return Response(res.json(), status=res.status_code)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)