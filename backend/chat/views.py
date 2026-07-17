from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Channel, Message, UserChannelState
from .serializers import ChannelSerializer, MessageSerializer

User = get_user_model()

class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        channel = self.get_object()
        user_ids = request.data.get('user_ids')
        user_id = request.data.get('user_id')
        
        if not user_ids and user_id:
            user_ids = [user_id]
            
        if not user_ids:
            return Response({"error": "user_id or user_ids is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        users_added = []
        for uid in user_ids:
            try:
                user = User.objects.get(id=uid)
                channel.members.add(user)
                users_added.append(user.username)
            except User.DoesNotExist:
                continue
                
        return Response({"message": f"{len(users_added)} members added to channel."})

    @action(detail=False, methods=['get'])
    def all_users(self, request):
        users = User.objects.all()
        # Return simple user list for the dropdown
        data = [{"id": u.id, "name": u.get_full_name() or u.username} for u in users]
        return Response(data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        channel = self.get_object()
        state, created = UserChannelState.objects.get_or_create(user=request.user, channel=channel)
        state.last_read_timestamp = timezone.now()
        state.save()
        return Response({"status": "marked read"})

    @action(detail=True, methods=['post'])
    def clear_chat(self, request, pk=None):
        channel = self.get_object()
        state, created = UserChannelState.objects.get_or_create(user=request.user, channel=channel)
        state.cleared_until_timestamp = timezone.now()
        state.last_read_timestamp = timezone.now()
        state.save()
        return Response({"status": "chat cleared"})

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().order_by('timestamp')
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter messages by channel if a channel_id is passed in the URL
        queryset = super().get_queryset()
        channel_id = self.request.query_params.get('channel_id')
        if channel_id:
            queryset = queryset.filter(channel_id=channel_id)
            
        if self.request.user.is_authenticated:
            # Filter out messages cleared by the user
            if channel_id:
                state = UserChannelState.objects.filter(user=self.request.user, channel_id=channel_id).first()
                if state and state.cleared_until_timestamp:
                    queryset = queryset.filter(timestamp__gt=state.cleared_until_timestamp)
            else:
                # This is more complex if not filtering by channel, but we usually fetch by channel.
                # Just keeping it simple for channel-specific fetches.
                pass
        return queryset

    def perform_create(self, serializer):
        # Safely assign the user if they are logged in, otherwise save it as an anonymous message
        if self.request.user.is_authenticated:
            message = serializer.save(user=self.request.user)
            
            # Send targeted notifications to other members
            from workspace.models import Notification
            channel = message.channel
            # Members to notify (exclude sender)
            members = channel.members.exclude(id=self.request.user.id)
            for member in members:
                Notification.objects.create(
                    user=member,
                    type='alert',
                    title=f"New Message in #{channel.name}",
                    message=f"{self.request.user.get_full_name() or self.request.user.username}: {message.content[:50]}"
                )
        else:
            serializer.save()