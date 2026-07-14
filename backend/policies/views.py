from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.views import TenantModelViewSet
from .models import Policy
from .serializers import PolicySerializer

class PolicyViewSet(TenantModelViewSet):
    queryset = Policy.objects.all().order_by('-updated_at')
    serializer_class = PolicySerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)