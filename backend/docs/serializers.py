from rest_framework import serializers
from .models import Document, Folder, SharedItem

class FolderSerializer(serializers.ModelSerializer):
    updatedAt = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    is_shared = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'owner', 'is_common', 'updatedAt', 'author', 'is_shared']
        read_only_fields = ['owner']

    def get_updatedAt(self, obj):
        return obj.updated_at.strftime("%b %d, %Y")

    def get_author(self, obj):
        return obj.owner.get_full_name() or obj.owner.username

    def get_is_shared(self, obj):
        # We can dynamically set this in views if it was accessed via a share
        return getattr(obj, 'is_shared_with_me', False)


class DocumentSerializer(serializers.ModelSerializer):
    updatedAt = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    is_shared = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'content', 'folder', 'file', 'file_url', 'updatedAt', 'author', 'is_shared']
        read_only_fields = ['owner']

    def get_updatedAt(self, obj):
        return obj.updated_at.strftime("%b %d, %Y")

    def get_author(self, obj):
        return obj.owner.get_full_name() or obj.owner.username

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_is_shared(self, obj):
        return getattr(obj, 'is_shared_with_me', False)


class SharedItemSerializer(serializers.ModelSerializer):
    shared_by_name = serializers.SerializerMethodField()
    shared_with_name = serializers.SerializerMethodField()
    folder_detail = FolderSerializer(source='folder', read_only=True)
    document_detail = DocumentSerializer(source='document', read_only=True)

    class Meta:
        model = SharedItem
        fields = ['id', 'folder', 'document', 'shared_by', 'shared_with', 'can_edit', 
                  'shared_by_name', 'shared_with_name', 'folder_detail', 'document_detail', 'created_at']
        read_only_fields = ['shared_by']

    def get_shared_by_name(self, obj):
        return obj.shared_by.get_full_name() or obj.shared_by.username

    def get_shared_with_name(self, obj):
        return obj.shared_with.get_full_name() or obj.shared_with.username