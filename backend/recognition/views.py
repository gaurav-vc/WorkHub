from rest_framework import viewsets
from .models import Kudos, Birthday
from .serializers import KudosSerializer, BirthdaySerializer

class KudosViewSet(viewsets.ModelViewSet):
    queryset = Kudos.objects.all().order_by('-created_at')
    serializer_class = KudosSerializer

class BirthdayViewSet(viewsets.ReadOnlyModelViewSet):
    # ReadOnly because Birthdays are usually managed by HR/Admin, not created by users directly
    queryset = Birthday.objects.all().order_by('day_number')
    serializer_class = BirthdaySerializer