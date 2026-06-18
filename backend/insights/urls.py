from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RiskIndicatorViewSet, insight_stats

router = DefaultRouter()
router.register(r'risks', RiskIndicatorViewSet, basename='risk')

urlpatterns = [
    path('stats/', insight_stats, name='insight-stats'),
    path('', include(router.urls)),
]