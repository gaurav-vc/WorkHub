import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        
        if not self.user or self.user.is_anonymous:
            await self.close()
            return
            
        # Group name specific to the user for notifications
        self.notification_group_name = f"user_notifications_{self.user.id}"
        
        # Join user-specific notification group
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group_name'):
            # Leave user-specific notification group
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    # Receive message from room group
    async def new_notification(self, event):
        notification_data = event["notification"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "new_notification",
            "notification": notification_data
        }))
