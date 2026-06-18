from rest_framework import serializers
from .models import BrandSetting

class BrandSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandSetting
        fields = '__all__'