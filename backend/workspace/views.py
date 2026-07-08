from rest_framework import viewsets
from django.db.models import Q
from rest_framework.decorators import api_view
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