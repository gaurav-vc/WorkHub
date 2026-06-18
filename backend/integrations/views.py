from rest_framework import viewsets
from .models import Integration
from .serializers import IntegrationSerializer

class IntegrationViewSet(viewsets.ModelViewSet):
    queryset = Integration.objects.all().order_by('name')
    serializer_class = IntegrationSerializer