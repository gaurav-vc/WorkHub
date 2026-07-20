from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.views import TenantModelViewSet
from role_base_access.permissions import RBACPermission
from .models import Policy
from .serializers import PolicySerializer

class PolicyViewSet(TenantModelViewSet):
    queryset = Policy.objects.all().order_by('-updated_at')
    serializer_class = PolicySerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsAuthenticated, RBACPermission]
    rbac_module = 'company-policies'