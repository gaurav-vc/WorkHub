from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from .models import Board, Column, Card, CardSubtask, CardChecklist, CardComment, CardAttachment
from .serializers import BoardSerializer, ColumnSerializer, CardSerializer
from core.utils import get_visible_users

class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            visible_users = get_visible_users(self.request.user)
            return Board.objects.filter(owner__in=visible_users).order_by('-id')
        return Board.objects.none()

    def perform_create(self, serializer):
        # 1. Save the new board with the current user as owner
        board = serializer.save(owner=self.request.user)
        
        # 2. Check the template from React
        template = self.request.data.get('template_type', 'project')
        
        # 3. If it's a numeric ID, it's a Market Template
        if str(template).isdigit():
            from templatesapp.services.template_import_service import TemplateImportService
            try:
                TemplateImportService.import_template_to_board(
                    template_id=int(template),
                    board_id=board.id,
                    user=self.request.user
                )
            except Exception as e:
                print("Failed to import market template:", e)
                # Fallback to basic if error
                Column.objects.create(board=board, title='To Do', color='bg-muted-foreground')
                Column.objects.create(board=board, title='In Progress', color='bg-primary')
                Column.objects.create(board=board, title='Done', color='bg-success')
        # 4. Otherwise, auto-generate hardcoded columns
        elif template == 'project':
            Column.objects.create(board=board, title='To Do', color='bg-muted-foreground')
            Column.objects.create(board=board, title='In Progress', color='bg-primary')
            Column.objects.create(board=board, title='Done', color='bg-success')
        elif template == 'sales':
            Column.objects.create(board=board, title='Leads', color='bg-info')
            Column.objects.create(board=board, title='Qualified', color='bg-warning')
            Column.objects.create(board=board, title='Closed', color='bg-success')
        else: # 'personal'
            Column.objects.create(board=board, title='Ideas', color='bg-accent')
            Column.objects.create(board=board, title='Doing', color='bg-primary')
            Column.objects.create(board=board, title='Done', color='bg-success')

# Fixed ViewSet names to match your urls.py!
class ColumnViewSet(viewsets.ModelViewSet):
    queryset = Column.objects.all()
    serializer_class = ColumnSerializer
    permission_classes = [IsAuthenticated]

class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Card.objects.none()
        from django.db.models import Q
        return Card.objects.filter(Q(assignee=user) | Q(created_by=user)).order_by('order')

    def create(self, request, *args, **kwargs):
        if request.data.get('assignee') == 'self':
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            data['assignee'] = request.user.id
            request._full_data = data
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.data.get('assignee') == 'self':
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            data['assignee'] = request.user.id
            request._full_data = data
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def add_subtask(self, request, pk=None):
        card = self.get_object()
        title = request.data.get('title')
        assignee_id = request.data.get('assigned_to')
        assignee = None
        if assignee_id and assignee_id != "unassigned":
            if assignee_id == "self":
                assignee = request.user
            else:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                assignee = User.objects.filter(id=assignee_id).first()
        if title:
            CardSubtask.objects.create(parent_card=card, title=title, assignee=assignee)
            return Response({"status": "subtask added"})
        return Response({"error": "title required"}, status=400)

    @action(detail=True, methods=['patch'])
    def update_subtask(self, request, pk=None):
        subtask_id = request.data.get('subtask_id')
        status = request.data.get('status')
        assignee_id = request.data.get('assigned_to')
        title = request.data.get('title')
        try:
            st = CardSubtask.objects.get(id=subtask_id)
            if status: st.status = status
            if title: st.title = title
            if 'assigned_to' in request.data:
                if assignee_id is None or assignee_id == "unassigned":
                    st.assignee = None
                elif assignee_id == "self":
                    st.assignee = request.user
                else:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    st.assignee = User.objects.filter(id=assignee_id).first()
            st.save()
            return Response({"status": "updated"})
        except CardSubtask.DoesNotExist:
            return Response({"error": "not found"}, status=404)

    @action(detail=True, methods=['delete'])
    def delete_subtask(self, request, pk=None):
        subtask_id = request.data.get('subtask_id') or request.query_params.get('subtask_id')
        try:
            st = CardSubtask.objects.get(id=subtask_id)
            st.delete()
            return Response({"status": "deleted"})
        except CardSubtask.DoesNotExist:
            return Response({"error": "not found"}, status=404)

    @action(detail=True, methods=['post'])
    def add_checklist(self, request, pk=None):
        card = self.get_object()
        title = request.data.get('title')
        if title:
            CardChecklist.objects.create(card=card, title=title)
            return Response({"status": "checklist added"})
        return Response({"error": "title required"}, status=400)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        card = self.get_object()
        text = request.data.get('text')
        if text:
            CardComment.objects.create(card=card, user=request.user, text=text)
            return Response({"status": "comment added"})
        return Response({"error": "text required"}, status=400)

    @action(detail=True, methods=['post'])
    def add_chat(self, request, pk=None):
        from .models import CardChat
        card = self.get_object()
        text = request.data.get('text')
        if text:
            CardChat.objects.create(card=card, user=request.user, text=text)
            return Response({"status": "chat added"})
        return Response({"error": "text required"}, status=400)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, pk=None):
        card = self.get_object()
        file_obj = request.data.get('file')
        if file_obj:
            CardAttachment.objects.create(
                card=card, 
                file=file_obj, 
                file_name=file_obj.name,
                uploaded_by=request.user
            )
            return Response({"status": "file uploaded"})
        return Response({"error": "file required"}, status=400)