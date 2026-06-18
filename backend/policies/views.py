from rest_framework import viewsets
from .models import Policy
from .serializers import PolicySerializer

class PolicyViewSet(viewsets.ModelViewSet):
    queryset = Policy.objects.all().order_by('-updated_at')
    serializer_class = PolicySerializer