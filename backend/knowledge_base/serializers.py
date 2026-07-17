from rest_framework import serializers
from .models import Article, ArticleCategory

class ArticleSerializer(serializers.ModelSerializer):
    updatedAt = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    # THE FIX: explicitly add required=False so Django stops rejecting the form!
    category = serializers.CharField(source='category.slug', required=False)
    readTime = serializers.CharField(source='read_time', required=False, allow_blank=True)

    is_helpful = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    helpful_count = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'excerpt', 'category', 'tags', 
            'author', 'readTime', 'views', 'updatedAt', 'content', 'file', 'file_url',
            'is_helpful', 'is_saved', 'helpful_count'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_updatedAt(self, obj):
        return obj.updated_at.strftime("%b %d, %Y")

    def get_author(self, obj):
        if obj.author:
            name = obj.author.get_full_name() or obj.author.username
            initials = "".join([n[0] for n in name.split()]).upper()[:2]
            return {"name": name, "initials": initials}
        return {"name": "Knowledge Team", "initials": "KT"}

    def get_is_helpful(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.helpful_users.filter(id=request.user.id).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(id=request.user.id).exists()
        return False

    def get_helpful_count(self, obj):
        return obj.helpful_users.count()