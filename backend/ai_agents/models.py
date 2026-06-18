from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()

class AIAgent(models.Model):
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50) # 'chat', 'docs', 'hr', etc.
    configuration = models.JSONField(default=dict)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.type})"

class AIConversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_conversations')
    company = models.CharField(max_length=255, null=True, blank=True)
    agent = models.CharField(max_length=50, default='chat')
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation {self.id} - {self.user.username}"

class AIMessage(models.Model):
    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20) # 'user', 'assistant', 'system'
    content = models.TextField()
    function_calls = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role} in {self.conversation.id}"

class AIUsageLog(models.Model):
    company = models.CharField(max_length=255, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    agent = models.CharField(max_length=50)
    tokens_used = models.IntegerField(default=0)
    cost_estimate = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class AIDocumentEmbedding(models.Model):
    company = models.CharField(max_length=255, null=True, blank=True)
    document_type = models.CharField(max_length=50) # 'knowledge_base', 'doc'
    reference_id = models.IntegerField()
    # If using pgvector, this would be a VectorField. 
    # For SQLite compatibility, we'll store as JSONField or text for now, 
    # but a true Vector DB like FAISS/Chroma will be used in practice or pgvector in Postgres.
    embedding_vector = models.JSONField() 
    updated_at = models.DateTimeField(auto_now=True)
