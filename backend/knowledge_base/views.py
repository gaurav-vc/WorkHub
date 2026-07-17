from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Article, ArticleCategory
from .serializers import ArticleSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().order_by('-views')
    serializer_class = ArticleSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'excerpt']

    def perform_create(self, serializer):
        # 1. Grab the category string from the React frontend (e.g., "engineering")
        cat_slug = self.request.data.get('category', 'engineering')
        if not cat_slug:
            cat_slug = 'engineering'
        
        # 2. Automatically find or create the ArticleCategory row in the database!
        category_obj, created = ArticleCategory.objects.get_or_create(
            slug=cat_slug,
            defaults={'name': cat_slug.replace('-', ' ').title()}
        )

        # 3. Auto-calculate a realistic Read Time based on the content length
        content = self.request.data.get('content', '')
        estimated_time = f"{max(1, len(content) // 500)} min"

        # 4. Save the article and automatically link the ForeignKeys to prevent crashes
        if self.request.user.is_authenticated:
            serializer.save(
                author=self.request.user, 
                category=category_obj, 
                read_time=estimated_time
            )
        else:
            serializer.save(
                category=category_obj, 
                read_time=estimated_time
            )

    @action(detail=True, methods=['post'])
    def toggle_helpful(self, request, pk=None):
        article = self.get_object()
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        if request.user in article.helpful_users.all():
            article.helpful_users.remove(request.user)
            helpful = False
        else:
            article.helpful_users.add(request.user)
            helpful = True
            
        return Response({"helpful": helpful, "count": article.helpful_users.count()})

    @action(detail=True, methods=['post'])
    def toggle_save(self, request, pk=None):
        article = self.get_object()
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        if request.user in article.saved_by.all():
            article.saved_by.remove(request.user)
            saved = False
        else:
            article.saved_by.add(request.user)
            saved = True
            
        return Response({"saved": saved})