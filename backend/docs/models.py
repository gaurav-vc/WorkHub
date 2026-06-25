from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_folders')
    is_common = models.BooleanField(default=False, help_text="If true, visible to everyone in the organization")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='docs_files/', null=True, blank=True)
    content = models.TextField(blank=True, help_text="Used for rich text notes if no file is uploaded")
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def file_name(self):
        if self.file:
            import os
            return os.path.basename(self.file.name)
        return ""

    @property
    def file_size(self):
        if self.file:
            try:
                size = self.file.size
                for unit in ['B', 'KB', 'MB', 'GB']:
                    if size < 1024.0:
                        return f"{size:.1f} {unit}"
                    size /= 1024.0
            except:
                return ""
        return ""

class SharedItem(models.Model):
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='shares')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, null=True, blank=True, related_name='shares')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items_shared_by')
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items_shared_with')
    can_edit = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        target = f"Folder: {self.folder.name}" if self.folder else f"Doc: {self.document.title}"
        return f"{self.shared_by.username} shared {target} with {self.shared_with.username}"