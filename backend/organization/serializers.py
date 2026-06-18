from rest_framework import serializers
from .models import UserProfile, Organization
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    class Meta:
        model = UserProfile
        fields = ['name', 'role', 'avatar_initials', 'leave_balance']
    def get_name(self, obj): return obj.user.get_full_name() or obj.user.username


class OrganizationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField(read_only=True)
    # Removed Admin Fields
    
    sites = serializers.SerializerMethodField(read_only=True)
    current_due = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'org_id', 'name', 'description', 'status', 'contact_details',
            'created_by', 'created_by_name', 
            'company_name', 'entity', 'site_location', 'country', 'region', 'state', 'city', 'zone',
            'white_label', 'sub_domain', 'solution_type', 'solution_for', 'billing_term',
            'rate_of_billing', 'billing_cycle', 'start_date', 'project_duration', 'end_date', 'billing_date',
            'created_at', 'updated_at', 'sites', 'current_due'
        ]
        read_only_fields = ['org_id', 'created_by', 'created_at', 'updated_at']

    def get_sites(self, obj):
        from .models import Site
        # We fetch related sites. To avoid circular imports, we just return basic data or use a simple serializer.
        sites = Site.objects.filter(organization=obj)
        return [
            {
                "id": s.id,
                "site_name": s.site_name,
                "product_type": s.product_type,
                "status": s.status
            } for s in sites
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None



    def get_current_due(self, obj):
        from django.db.models import Sum
        unpaid = obj.payments.exclude(status='paid').aggregate(Sum('amount'))['amount__sum']
        return unpaid or 0.00

from .models import Site

class SiteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField(read_only=True)
    organization_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Site
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    organization_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None