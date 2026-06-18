from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, ColumnViewSet, CardViewSet

# The DefaultRouter automatically wires up GET, POST, PATCH, and DELETE seamlessly!
router = DefaultRouter()
router.register(r'boards', BoardViewSet, basename='board')
router.register(r'columns', ColumnViewSet, basename='column')
router.register(r'cards', CardViewSet, basename='card')

urlpatterns = [
    # This single line includes all the routes perfectly
    path('', include(router.urls)),
]