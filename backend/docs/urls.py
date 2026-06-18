from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, FolderViewSet, SharedItemViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'folders', FolderViewSet, basename='folder')
router.register(r'shares', SharedItemViewSet, basename='share')

urlpatterns = [
    path('', include(router.urls)),
]