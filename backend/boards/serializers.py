from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Board, Column, Card, CardChecklist, CardSubtask, CardComment, CardAttachment, CardChat

User = get_user_model()

class CardChatSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = CardChat
        fields = ['id', 'user', 'user_name', 'text', 'created_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not ret.get('user_name') and getattr(instance, 'user', None):
            ret['user_name'] = instance.user.username
        return ret

class CardChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardChecklist
        fields = '__all__'

class CardSubtaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.username', read_only=True, default=None, allow_null=True)
    
    class Meta:
        model = CardSubtask
        fields = '__all__'

class CardCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = CardComment
        fields = ['id', 'user', 'user_name', 'text', 'created_at']

class CardAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True, default=None, allow_null=True)
    
    class Meta:
        model = CardAttachment
        fields = ['id', 'file', 'file_name', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']

class CardSerializer(serializers.ModelSerializer):
    assignee_detail = serializers.SerializerMethodField()
    dueDate = serializers.SerializerMethodField()
    
    # Nested fields for the modal
    checklists = CardChecklistSerializer(many=True, read_only=True)
    subtasks = CardSubtaskSerializer(many=True, read_only=True)
    comments = CardCommentSerializer(many=True, read_only=True)
    attachments = CardAttachmentSerializer(many=True, read_only=True)
    chats = CardChatSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    board_id = serializers.IntegerField(source='column.board_id', read_only=True, default=None, allow_null=True)
    board_title = serializers.CharField(source='column.board.title', read_only=True, default=None, allow_null=True)

    class Meta:
        model = Card
        fields = [
            'id', 'title', 'description', 'labels', 'assignee', 'assignee_detail', 'dueDate', 'due_date', 
            'priority', 'status', 'order', 'column', 'created_at', 'created_by_name',
            'checklists', 'subtasks', 'comments', 'attachments', 'chats', 'board_id', 'board_title'
        ]

    def get_created_by_name(self, obj):
        created_by = getattr(obj, 'created_by', None)
        if created_by:
            return created_by.get_full_name() or created_by.username
        if getattr(obj, 'column', None) and getattr(obj.column, 'board', None) and getattr(obj.column.board, 'owner', None):
            return obj.column.board.owner.get_full_name() or obj.column.board.owner.username
        return "System"

    def get_assignee_detail(self, obj):
        assignee = getattr(obj, 'assignee', None)
        if assignee:
            name = assignee.get_full_name() or assignee.username
            initials = "".join([n[0] for n in name.split() if n]).upper()[:2]
            return {"id": assignee.id, "name": name, "initials": initials, "email": getattr(assignee, 'email', '')}
        return None

    def get_dueDate(self, obj):
        due_date = getattr(obj, 'due_date', None)
        if not due_date:
            return None
        
        # Guard against unparsed string dates from DB anomalies
        if isinstance(due_date, str):
            from datetime import datetime
            try:
                due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
            except ValueError:
                return due_date # Return raw if unable to parse

        try:
            return due_date.strftime("%b %d")
        except AttributeError:
            return str(due_date)

class ColumnSerializer(serializers.ModelSerializer):
    # Filter nested cards to only show personal tasks (assigned to or created by user)
    cards = serializers.SerializerMethodField()

    class Meta:
        model = Column
        fields = ['id', 'title', 'color', 'order', 'cards', 'board']
        
    def get_cards(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        if user and user.is_authenticated:
            from django.db.models import Q
            filtered_cards = obj.cards.filter(Q(assignee=user) | Q(created_by=user)).order_by('order')
            return CardSerializer(filtered_cards, many=True, context=self.context).data
        return []


class BoardSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = ['id', 'title', 'description', 'template_type', 'columns', 'due_date', 'status']