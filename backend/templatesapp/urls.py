from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TemplateCategoryViewSet, TemplateViewSet

router = DefaultRouter()
router.register(r'categories', TemplateCategoryViewSet, basename='template-categories')
router.register(r'', TemplateViewSet, basename='templates')

urlpatterns = [
    path('', include(router.urls)),
]