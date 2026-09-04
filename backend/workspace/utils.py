import json
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from pywebpush import webpush, WebPushException

from workspace.models import Notification, PushSubscription

logger = logging.getLogger(__name__)

def notify_user(user, title, message, notification_type="system", link=""):
    """
    Sends a real-time notification to the user via WebSockets and Web Push,
    and persists it in the database.
    """
    if not user or not getattr(user, 'is_active', True):
        return

    # 1. Save to Database
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        type=notification_type,
        link=link
    )

    # Convert to dict for JSON serialization
    notification_data = {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "link": notification.link,
        "time": notification.time.isoformat(),
        "is_read": notification.is_read
    }

    # 2. Broadcast via WebSocket
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"user_notifications_{user.id}"
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "new_notification",
                    "notification": notification_data
                }
            )
        except Exception as e:
            logger.error(f"WebSocket send failed for user {user.id}: {e}")

    # 3. Web Push Notification
    # Only proceed if VAPID keys are configured in settings
    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
    vapid_claims = getattr(settings, 'VAPID_CLAIMS', None)

    if vapid_private_key and vapid_claims:
        subscriptions = PushSubscription.objects.filter(user=user)
        for sub in subscriptions:
            try:
                subscription_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                }
                
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(notification_data),
                    vapid_private_key=vapid_private_key,
                    vapid_claims=vapid_claims
                )
            except WebPushException as ex:
                logger.error(f"Web Push failed: {repr(ex)}")
                # If subscription is no longer valid, delete it (HTTP 410 Gone)
                if ex.response and getattr(ex.response, 'status_code', None) == 410:
                    sub.delete()
            except Exception as e:
                logger.error(f"Web Push error: {e}")
