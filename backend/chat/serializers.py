from rest_framework import serializers
from .models import Channel, Message

class MessageSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)
    initials = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'channel', 'user', 'initials', 'time', 'content', 'reactions', 'file', 'file_name']

    def get_initials(self, obj):
        name = obj.user.get_full_name() or obj.user.username
        return "".join([n[0] for n in name.split()]).upper()[:2]

    def get_time(self, obj):
        # Returns time in a format like "10:30 AM"
        return obj.timestamp.strftime("%I:%M %p")

class ChannelSerializer(serializers.ModelSerializer):
    # This matches your React interface
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ['id', 'name', 'description', 'unread']

    def get_unread(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        from .models import UserChannelState, Message
        state = UserChannelState.objects.filter(user=request.user, channel=obj).first()
        if state:
            return Message.objects.filter(channel=obj, timestamp__gt=state.last_read_timestamp).count()
        return Message.objects.filter(channel=obj).count()