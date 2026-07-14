from django.db import models
from django.contrib.auth import get_user_model
from core.tenant import TenantModel

User = get_user_model()

class ArticleCategory(TenantModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField()

    class Meta:
        unique_together = ('slug', 'organization')

    def __str__(self):
        return self.name

class Article(TenantModel):
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True, default="")
    content = models.TextField(blank=True, default="")
    file = models.FileField(upload_to='kb_files/', null=True, blank=True)
    category = models.ForeignKey(ArticleCategory, on_delete=models.CASCADE, related_name='articles')
    tags = models.JSONField(default=list, blank=True) # Stores arrays like ["Guide", "HR"]
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    read_time = models.CharField(max_length=50, blank=True)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title