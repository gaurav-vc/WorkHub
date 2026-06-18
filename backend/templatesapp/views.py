from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny # <-- The key to unlocking the API
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .models import TemplateCategory, Template
from .serializers import (
    TemplateCategorySerializer, TemplateListSerializer, 
    TemplateDetailSerializer, ImportTemplateSerializer
)
from .services.template_import_service import TemplateImportService

User = get_user_model()

class TemplateCategoryViewSet(viewsets.ModelViewSet):
    """API endpoint for Template Categories."""
    queryset = TemplateCategory.objects.filter(is_active=True)
    serializer_class = TemplateCategorySerializer
    # 1. Unlock the categories
    permission_classes = [AllowAny] 
    pagination_class = None 


class TemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for Templates in the Marketplace."""
    queryset = Template.objects.filter(is_public=True).select_related('category')
    
    # 2. Unlock the templates
    permission_classes = [AllowAny] 
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_featured']
    search_fields = ['title', 'description']
    ordering_fields = ['usage_count', 'created_at']
    ordering = ['-is_featured', '-usage_count']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TemplateDetailSerializer
        return TemplateListSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        tasks_data = data.pop('tasks', [])
        columns_data = data.pop('columns', [])
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Fallback to first user if anonymous
        user = request.user if request.user.is_authenticated else User.objects.first()
        template = serializer.save(created_by=user, columns=columns_data)
        
        from .models import TemplateTask
        for idx, task_data in enumerate(tasks_data):
            title = task_data.get('title', '').strip()
            status_val = task_data.get('status', 'pending').strip()
            if title:
                TemplateTask.objects.create(
                    template=template,
                    title=title,
                    default_status=status_val,
                    order=idx
                )
                
        # Update estimated_tasks if tasks were provided and it's misaligned
        if tasks_data and template.estimated_tasks != len(tasks_data):
            template.estimated_tasks = len(tasks_data)
            template.save()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # 3. Unlock the import action and protect the database
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def import_template(self, request, pk=None):
        serializer = ImportTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        project_id = serializer.validated_data['project_id']
        template_id = pk
        
        # Safety Net: If no user is logged in via React, fallback to the first Admin user
        # so the database doesn't crash when trying to assign tasks!
        active_user = request.user if request.user.is_authenticated else User.objects.first()
        
        try:
            result = TemplateImportService.import_template_to_project(
                template_id=template_id,
                project_id=project_id,
                user=active_user
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            return Response({"error": f"Internal Integration Error: {str(e)}\nTraceback:\n{tb_str}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)