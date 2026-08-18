import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
            
        # Group name specific to the user for direct push notifications
        self.user_group_name = f"user_{self.user.id}"
        
        # Join user-specific group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            # Leave user-specific group
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event["message"]
        channel_id = event["channel_id"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "channel_id": channel_id,
            "message": message
        }))

    # Receive new channel notification
    async def new_channel(self, event):
        channel_id = event["channel_id"]
        
        # Send to WebSocket
        await self.send(text_data=json.dumps({
            "type": "new_channel",
            "channel_id": channel_id
        }))


from channels.db import database_sync_to_async

class WorkspaceConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def get_user_org_id(self, user):
        org = None
        try:
            if hasattr(user, 'auth_profile') and user.auth_profile and getattr(user.auth_profile, 'organization', None):
                org = user.auth_profile.organization
            elif hasattr(user, 'res_employee') and user.res_employee and getattr(user.res_employee, 'organization', None):
                org = user.res_employee.organization
        except Exception:
            pass
        return org.id if org else None

    async def connect(self):
        self.user = self.scope.get("user")
        
        if not self.user or self.user.is_anonymous:
            await self.close()
            return
            
        org_id = await self.get_user_org_id(self.user)
            
        if org_id:
            self.org_group_name = f"org_{org_id}"
            await self.channel_layer.group_add(
                self.org_group_name,
                self.channel_name
            )
            
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'org_group_name'):
            await self.channel_layer.group_discard(
                self.org_group_name,
                self.channel_name
            )

    async def workspace_event(self, event):
        # Forward event to WebSocket
        await self.send(text_data=json.dumps({
            "event": event["event_type"],
            "data": event.get("data", {})
        }))
