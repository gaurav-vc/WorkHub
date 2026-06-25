from rest_framework import serializers
from .models import Workflow, WorkflowLog, WorkflowDefinition, WorkflowVersion, WorkflowExecution, ApprovalTask

class WorkflowLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowLog
        fields = '__all__'

class WorkflowSerializer(serializers.ModelSerializer):
    logs = WorkflowLogSerializer(many=True, read_only=True)

    class Meta:
        model = Workflow
        fields = '__all__'

class WorkflowVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowVersion
        fields = '__all__'

class WorkflowDefinitionSerializer(serializers.ModelSerializer):
    versions = WorkflowVersionSerializer(many=True, read_only=True)

    class Meta:
        model = WorkflowDefinition
        fields = '__all__'

class WorkflowExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowExecution
        fields = '__all__'

class ApprovalTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalTask
        fields = '__all__'