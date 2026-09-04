from rest_framework import viewsets
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer
from core.views import TenantModelViewSet

class NotificationViewSet(TenantModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            Q(user=self.request.user) | Q(user__isnull=True)
        ).order_by('-time')

@api_view(['GET'])
def ai_assistant_agent(request):
    return Response({"message": "AI Chat Working"})

from .models import PushSubscription

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_to_push(request):
    data = request.data
    endpoint = data.get('endpoint')
    keys = data.get('keys', {})
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')

    if not endpoint or not p256dh or not auth:
        return Response({"error": "Invalid subscription payload"}, status=400)

    PushSubscription.objects.update_or_create(
        user=request.user,
        endpoint=endpoint,
        defaults={
            'p256dh': p256dh,
            'auth': auth
        }
    )
    
    return Response({"status": "subscribed"})