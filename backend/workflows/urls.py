from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet, WorkflowDefinitionViewSet, WorkflowVersionViewSet, WorkflowExecutionViewSet, ApprovalTaskViewSet

# Using DefaultRouter to guarantee NO "405 Method Not Allowed" errors
router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'definitions', WorkflowDefinitionViewSet, basename='definition')
router.register(r'versions', WorkflowVersionViewSet, basename='version')
router.register(r'executions', WorkflowExecutionViewSet, basename='execution')
router.register(r'tasks', ApprovalTaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]