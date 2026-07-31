from rest_framework import serializers
from .models import Channel, Message

class MessageSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    initials = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'channel', 'user', 'initials', 'time', 'timestamp', 'content', 'reactions', 'file', 'file_name']

    def get_initials(self, obj):
        name = obj.user.get_full_name() or obj.user.username
        return "".join([n[0] for n in name.split()]).upper()[:2]

    def get_time(self, obj):
        # Returns time in a format like "10:30 AM"
        return obj.timestamp.strftime("%I:%M %p")

class ChannelSerializer(serializers.ModelSerializer):
    # This matches your React interface
    unread = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    member_details = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ['id', 'name', 'display_name', 'description', 'unread', 'is_group', 'member_details']

    def get_member_details(self, obj):
        if not obj.is_group:
            return []
        members = obj.members.all()
        return [{
            'id': m.id,
            'name': m.get_full_name() or m.username,
            'username': m.username,
            'date_joined': m.date_joined.isoformat() if m.date_joined else None
        } for m in members]

    def get_unread(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        from .models import UserChannelState, Message
        state = UserChannelState.objects.filter(user=request.user, channel=obj).first()
        if state:
            return Message.objects.filter(channel=obj, timestamp__gt=state.last_read_timestamp).exclude(user=request.user).count()
        return Message.objects.filter(channel=obj).exclude(user=request.user).count()

    def get_display_name(self, obj):
        if obj.is_group:
            return obj.name
        
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.name

        # For 1-to-1 chats, find the other member's name
        other_member = obj.members.exclude(id=request.user.id).first()
        if other_member:
            return other_member.get_full_name() or other_member.username
        
        return "Just You"