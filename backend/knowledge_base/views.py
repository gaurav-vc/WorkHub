from rest_framework import viewsets, filters
from .models import Article, ArticleCategory
from .serializers import ArticleSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().order_by('-views')
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content', 'excerpt']

    def perform_create(self, serializer):
        # 1. Grab the category string from the React frontend (e.g., "engineering")
        cat_slug = self.request.data.get('category', 'engineering')
        
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