import requests
from django.utils import timezone
from datetime import timedelta
import logging
from django.conf import settings
from dateutil import parser

logger = logging.getLogger(__name__)

def sync_microsoft_emails():
    from .models import MicrosoftCredentials, SyncedEmail
    
    credentials = MicrosoftCredentials.objects.all()
    client_id = getattr(settings, 'AZURE_CLIENT_ID', None)
    client_secret = getattr(settings, 'AZURE_CLIENT_SECRET', None)
    
    if not client_id or not client_secret:
        return
        
    for cred in credentials:
        # Check if token is expired or expiring soon (within 5 minutes)
        if cred.expires_at <= timezone.now() + timedelta(minutes=5):
            # Refresh token
            token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
            token_data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': cred.refresh_token,
                'grant_type': 'refresh_token',
            }
            r = requests.post(token_url, data=token_data)
            if r.status_code == 200:
                token_response = r.json()
                cred.access_token = token_response.get('access_token')
                if 'refresh_token' in token_response:
                    cred.refresh_token = token_response['refresh_token']
                expires_in = token_response.get('expires_in', 3600)
                cred.expires_at = timezone.now() + timedelta(seconds=expires_in)
                cred.save()
            else:
                logger.error(f"Failed to refresh token for user {cred.user.id}")
                continue
                
        # Fetch emails
        headers = {
            'Authorization': f'Bearer {cred.access_token}',
            'Accept': 'application/json'
        }
        # Get top 20 recent messages
        graph_url = "https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime DESC"
        r = requests.get(graph_url, headers=headers)
        
        if r.status_code == 200:
            messages = r.json().get('value', [])
            for msg in messages:
                message_id = msg.get('id')
                subject = msg.get('subject')
                body_preview = msg.get('bodyPreview')
                
                sender = msg.get('sender', {}).get('emailAddress', {})
                sender_name = sender.get('name')
                sender_email = sender.get('address')
                
                received_date_str = msg.get('receivedDateTime')
                received_date = parser.parse(received_date_str) if received_date_str else None
                
                is_read = msg.get('isRead', False)
                web_link = msg.get('webLink')
                
                SyncedEmail.objects.update_or_create(
                    message_id=message_id,
                    user=cred.user,
                    defaults={
                        'subject': subject,
                        'body_preview': body_preview,
                        'sender_name': sender_name,
                        'sender_email': sender_email,
                        'received_date': received_date,
                        'is_read': is_read,
                        'web_link': web_link,
                    }
                )
        else:
            logger.error(f"Failed to fetch emails for user {cred.user.id}: {r.text}")
