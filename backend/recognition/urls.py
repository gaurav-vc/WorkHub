from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KudosViewSet, BirthdayViewSet

router = DefaultRouter()
router.register(r'kudos', KudosViewSet, basename='kudos')
router.register(r'birthdays', BirthdayViewSet, basename='birthday')

urlpatterns = [
    path('', include(router.urls)),
]