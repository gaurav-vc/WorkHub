from rest_framework import serializers
from .models import RoleAccessMapping, FeatureAccessRequest, Role

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class RoleAccessMappingSerializer(serializers.ModelSerializer):
    module_state = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = RoleAccessMapping
        fields = [
            'id', 
            'site_id', 
            'site_name', 
            'role', 
            'title', 
            'permissions', 
            'module_state', 
            'updated_at', 
            'created_at'
        ]

class FeatureAccessRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = FeatureAccessRequest
        fields = ['id', 'user_name', 'user_email', 'module_name', 'status', 'requested_at', 'resolved_at', 'resolved_by']