from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, FolderViewSet, SharedItemViewSet

from core.views import api_documentation

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'folders', FolderViewSet, basename='folder')
router.register(r'shares', SharedItemViewSet, basename='share')

urlpatterns = [
    path('reference/', api_documentation, name='docs_reference'),
    path('spec/', api_documentation, name='docs_spec'),
    path('', include(router.urls)),
]