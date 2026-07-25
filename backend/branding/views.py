from rest_framework import viewsets
from .models import BrandSetting
from .serializers import BrandSettingSerializer

class BrandSettingViewSet(viewsets.ModelViewSet):
    queryset = BrandSetting.objects.all()


    def get_queryset(self):

        return BrandSetting.objects.all()
    serializer_class = BrandSettingSerializer