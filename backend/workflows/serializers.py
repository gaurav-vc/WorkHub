from rest_framework import serializers
from .models import Workflow, WorkflowLog

class WorkflowLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowLog
        fields = '__all__'

class WorkflowSerializer(serializers.ModelSerializer):
    logs = WorkflowLogSerializer(many=True, read_only=True)

    class Meta:
        model = Workflow
        fields = '__all__'