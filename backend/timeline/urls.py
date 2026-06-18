from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GanttTaskViewSet

router = DefaultRouter()
router.register(r'', GanttTaskViewSet, basename='timeline')

urlpatterns = [
    path('', include(router.urls)),
]