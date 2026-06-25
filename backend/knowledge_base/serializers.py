from rest_framework import serializers
from .models import Article, ArticleCategory

class ArticleSerializer(serializers.ModelSerializer):
    updatedAt = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    # THE FIX: explicitly add required=False so Django stops rejecting the form!
    category = serializers.CharField(source='category.slug', required=False)
    readTime = serializers.CharField(source='read_time', required=False, allow_blank=True)

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'excerpt', 'category', 'tags', 
            'author', 'readTime', 'views', 'updatedAt', 'content', 'file', 'file_url'
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