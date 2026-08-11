import requests
from django.utils import timezone
from datetime import timedelta
import logging
from django.conf import settings
from dateutil import parser

logger = logging.getLogger(__name__)

def sync_all_emails(specific_account_id=None, user_id=None):
    from .models import EmailAccount, SyncedEmail
    
    # Base query for active accounts
    qs = EmailAccount.objects.filter(is_active=True)
    if specific_account_id:
        qs = qs.filter(id=specific_account_id)
    if user_id:
        qs = qs.filter(user_id=user_id)
        
    for account in qs:
        # Refresh token if expired or expiring soon
        if account.expires_at <= timezone.now() + timedelta(minutes=5):
            refreshed = refresh_token(account)
            if not refreshed:
                continue
                
        # Ensure any records created during this sync inherit the account's tenant context
        from core.tenant import tenant_context
        with tenant_context(organization_id=account.organization_id, site_id=account.site_id):
            if account.provider == 'microsoft':
                sync_microsoft_account(account)
            elif account.provider == 'google':
                sync_google_account(account)

def refresh_token(account):
    if account.provider == 'microsoft':
        client_id = getattr(settings, 'AZURE_CLIENT_ID', None)
        client_secret = getattr(settings, 'AZURE_CLIENT_SECRET', None)
        token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    elif account.provider == 'google':
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
        client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
        token_url = "https://oauth2.googleapis.com/token"
    else:
        return False
        
    if not client_id or not client_secret or not account.refresh_token:
        return False
        
    token_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': account.refresh_token,
        'grant_type': 'refresh_token',
    }
    
    r = requests.post(token_url, data=token_data)
    if r.status_code == 200:
        data = r.json()
        account.access_token = data.get('access_token')
        if 'refresh_token' in data:
            account.refresh_token = data['refresh_token']
        expires_in = data.get('expires_in', 3600)
        account.expires_at = timezone.now() + timedelta(seconds=expires_in)
        account.save()
        return True
    else:
        logger.error(f"Failed to refresh {account.provider} token for account {account.id}")
        return False

def sync_microsoft_account(account):
    from .models import SyncedEmail
    headers = {'Authorization': f'Bearer {account.access_token}', 'Accept': 'application/json'}
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
            
            from django.db import IntegrityError, OperationalError
            try:
                SyncedEmail.objects.update_or_create(
                    message_id=message_id,
                    user=account.user,
                    defaults={
                        'account': account,
                        'subject': subject,
                        'body_preview': body_preview,
                        'sender_name': sender_name,
                        'sender_email': sender_email,
                        'received_date': received_date,
                        'is_read': is_read,
                        'web_link': web_link,
                    }
                )
            except (IntegrityError, OperationalError) as e:
                logger.warning(f"Skipping email sync for {message_id} due to DB lock or constraint: {e}")
    else:
        logger.error(f"Failed to fetch Microsoft emails for account {account.id}")

def sync_google_account(account):
    from .models import SyncedEmail
    headers = {'Authorization': f'Bearer {account.access_token}'}
    # Get recent messages list
    list_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20"
    r = requests.get(list_url, headers=headers)
    
    if r.status_code == 200:
        messages = r.json().get('messages', [])
        for msg_ref in messages:
            msg_id = msg_ref.get('id')
            # Fetch message metadata
            detail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date"
            detail_r = requests.get(detail_url, headers=headers)
            if detail_r.status_code == 200:
                msg = detail_r.json()
                
                headers_list = msg.get('payload', {}).get('headers', [])
                headers_dict = {h['name'].lower(): h['value'] for h in headers_list}
                
                subject = headers_dict.get('subject', '')
                from_header = headers_dict.get('from', '')
                
                # Parse From header (e.g. "John Doe <john@example.com>" or just "john@example.com")
                import re
                sender_name = from_header
                sender_email = from_header
                match = re.search(r'(.*)<(.*)>', from_header)
                if match:
                    sender_name = match.group(1).strip().strip('"')
                    sender_email = match.group(2).strip()
                
                date_str = headers_dict.get('date')
                received_date = parser.parse(date_str) if date_str else None
                
                body_preview = msg.get('snippet', '')
                
                label_ids = msg.get('labelIds', [])
                is_read = 'UNREAD' not in label_ids
                
                web_link = f"https://mail.google.com/mail/u/0/#inbox/{msg_id}"
                
                from django.db import IntegrityError, OperationalError
                try:
                    SyncedEmail.objects.update_or_create(
                        message_id=msg_id,
                        user=account.user,
                        defaults={
                            'account': account,
                            'subject': subject,
                            'body_preview': body_preview,
                            'sender_name': sender_name,
                            'sender_email': sender_email,
                            'received_date': received_date,
                            'is_read': is_read,
                            'web_link': web_link,
                        }
                    )
                except (IntegrityError, OperationalError) as e:
                    logger.warning(f"Skipping email sync for {msg_id} due to DB lock or constraint: {e}")
    else:
        logger.error(f"Failed to fetch Google emails for account {account.id}")
