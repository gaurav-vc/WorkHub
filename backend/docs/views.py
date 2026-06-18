from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Folder, Document, SharedItem
from .serializers import FolderSerializer, DocumentSerializer, SharedItemSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # By default, return folders owned by the user, or common folders
        return Folder.objects.filter(Q(owner=user) | Q(is_common=True)).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def shared_with_me(self, request):
        shares = SharedItem.objects.filter(shared_with=request.user, folder__isnull=False)
        folders = [share.folder for share in shares]
        for f in folders:
            f.is_shared_with_me = True
        serializer = self.get_serializer(folders, many=True)
        return Response(serializer.data)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        # Return docs owned by user, or in common folders
        return Document.objects.filter(Q(owner=user) | Q(folder__is_common=True)).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def shared_with_me(self, request):
        shares = SharedItem.objects.filter(shared_with=request.user, document__isnull=False)
        docs = [share.document for share in shares]
        for d in docs:
            d.is_shared_with_me = True
        serializer = self.get_serializer(docs, many=True)
        return Response(serializer.data)


class SharedItemViewSet(viewsets.ModelViewSet):
    serializer_class = SharedItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SharedItem.objects.filter(shared_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(shared_by=self.request.user)