from rest_framework import viewsets
from .models import Role, AuditLog
from .serializers import RoleSerializer, AuditLogSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer

class AuditLogViewSet(viewsets.ModelViewSet):
    queryset = AuditLog.objects.all().order_by('-id')
    serializer_class = AuditLogSerializer