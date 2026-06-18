# backend/timeline/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Employee
from boards.models import Card, Board, Column
from core.utils import get_visible_users
from .serializers import GanttTaskSerializer, EmployeeSerializer
from core.views import TenantModelViewSet

class GanttTaskViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    serializer_class = GanttTaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_authenticated:
            return queryset.none()
        visible_users = get_visible_users(self.request.user)
        return queryset.filter(assignee__in=visible_users).order_by('id')

    def perform_create(self, serializer):
        user = self.request.user
        board, _ = Board.objects.get_or_create(
            title="My Board",
            owner=user,
            defaults={'template_type': 'personal'}
        )
        column, _ = Column.objects.get_or_create(
            board=board,
            title="Todo",
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        serializer.save(created_by=user, column=column)

    # Appends endpoint /api/timeline/employees/ directly matching your frontend context
    @action(detail=False, methods=['get'], url_path='employees')
    def get_employees(self, request):
        employees = Employee.objects.all()
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)