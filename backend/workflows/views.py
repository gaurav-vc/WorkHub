from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Workflow, WorkflowLog, WorkflowDefinition, WorkflowVersion, WorkflowExecution, ApprovalTask
from .serializers import WorkflowSerializer, WorkflowDefinitionSerializer, WorkflowVersionSerializer, WorkflowExecutionSerializer, ApprovalTaskSerializer
from django.apps import apps
from django.contrib.auth import get_user_model

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all().order_by('-created_at')
    serializer_class = WorkflowSerializer

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        workflow = self.get_object()
        from .utils import execute_workflow_engine
        
        try:
            # Execute synchronously so the frontend can catch and display errors
            execute_workflow_engine(workflow, user_context=request.user, raise_errors=True)
            
            serializer = self.get_serializer(workflow)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WorkflowDefinitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowDefinition.objects.all().order_by('-created_at')
    serializer_class = WorkflowDefinitionSerializer

class WorkflowVersionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowVersion.objects.all().order_by('-published_at')
    serializer_class = WorkflowVersionSerializer

class WorkflowExecutionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowExecution.objects.all().order_by('-started_at')
    serializer_class = WorkflowExecutionSerializer

class ApprovalTaskViewSet(viewsets.ModelViewSet):
    queryset = ApprovalTask.objects.all().order_by('-sla_deadline')
    serializer_class = ApprovalTaskSerializer