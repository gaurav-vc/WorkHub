from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HRRequestViewSet, AttendanceViewSet, LeaderboardViewSet

router = DefaultRouter()
router.register(r'requests', HRRequestViewSet, basename='hr-request')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')

urlpatterns = [
    path('', include(router.urls)),
]