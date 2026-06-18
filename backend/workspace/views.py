from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer
from core.views import TenantModelViewSet

class NotificationViewSet(TenantModelViewSet):
    queryset = Notification.objects.all().order_by('-time')
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
def ai_assistant_agent(request):
    return Response({"message": "AI Chat Working"})