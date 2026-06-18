from rest_framework import serializers
from .models import RiskIndicator

class RiskIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskIndicator
        fields = '__all__'