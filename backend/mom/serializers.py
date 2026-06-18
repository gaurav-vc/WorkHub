from rest_framework import serializers
from .models import MOM, MOMPoint, MOMAttendee, MOMAgenda
from django.contrib.auth.models import User
from Project.models import Task
from workspace.models import Notification
from django.core.mail import send_mail

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class MOMPointSerializer(serializers.ModelSerializer):
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)

    class Meta:
        model = MOMPoint
        fields = ['id', 'mom', 'text', 'assigned_to', 'assigned_to_details', 'is_task_converted', 'task', 'status', 'department', 'priority', 'planned_date', 'actual_date', 'remarks', 'created_at']
        read_only_fields = ['id', 'is_task_converted', 'task', 'created_at']

class MOMAttendeeSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = MOMAttendee
        fields = ['id', 'mom', 'is_external', 'user', 'user_details', 'name', 'email', 'phone']
        read_only_fields = ['id']

class MOMAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MOMAgenda
        fields = ['id', 'mom', 'topic', 'remarks', 'created_at']
        read_only_fields = ['id', 'created_at']

class MOMSerializer(serializers.ModelSerializer):
    points = MOMPointSerializer(many=True, read_only=True)
    attendees = MOMAttendeeSerializer(many=True, read_only=True)
    agendas = MOMAgendaSerializer(many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    points_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    agendas_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = MOM
        fields = ['id', 'title', 'description', 'meeting_date', 'client_name', 'site_name', 'location', 'start_time', 'end_time', 'meeting_type', 'prepared_by', 'meeting_status', 'tags', 'created_by', 'created_by_details', 'created_at', 'points', 'points_data', 'attendees', 'agendas', 'agendas_data']
        read_only_fields = ['id', 'created_by', 'created_at']

    def handle_point_task_creation(self, point, user, old_assignee=None):
        if not point.assigned_to:
            return

        is_new_assignment = False
        
        if not point.is_task_converted:
            task = Task.objects.create(
                title=f"MOM Task: {point.mom.title}",
                description=f"From MOM '{point.mom.title}' - Point: {point.text}",
                assigned_to=point.assigned_to,
                created_by=user,
                due_date=point.planned_date or point.mom.meeting_date,
                status='open'
            )
            point.is_task_converted = True
            point.task = task
            point.save()
            is_new_assignment = True
        elif point.is_task_converted and point.task and old_assignee != point.assigned_to:
            point.task.assigned_to = point.assigned_to
            point.task.save()
            is_new_assignment = True

        # Ensure Card exists to reflect in MyDay, Dashboard, and MyBoards
        from boards.models import Board, Column, Card
        board, _ = Board.objects.get_or_create(
            title="My Board",
            owner=point.assigned_to,
            defaults={'template_type': 'personal'}
        )
        column, _ = Column.objects.get_or_create(
            board=board,
            title="Todo",
            defaults={'order': 0, 'color': 'bg-primary'}
        )
        
        # Match by title prefix and assignee
        title_start = f"MOM Task: {point.text[:50]}"
        card = Card.objects.filter(assignee=point.assigned_to, title__startswith=title_start).first()
        
        if not card:
            priority_map = {
                'High': 'P2',
                'Medium': 'P3',
                'Low': 'P4'
            }
            card_priority = priority_map.get(point.priority, 'P3')
            
            card_status = 'pending'
            if point.status == 'Completed':
                card_status = 'done'
            elif point.status == 'In Progress':
                card_status = 'in_progress'

            Card.objects.create(
                title=title_start,
                description=f"From MOM '{point.mom.title}'\n\nPoint: {point.text}",
                priority=card_priority,
                status=card_status,
                column=column,
                assignee=point.assigned_to,
                created_by=user,
                due_date=point.planned_date or point.mom.meeting_date
            )

        if is_new_assignment:
            due_date_str = str(point.planned_date or point.mom.meeting_date)
            notification_msg = f"{point.text}\nAssigned By: {user.first_name or user.username}\nDue: {due_date_str}\nSource: {point.mom.title}"
            
            Notification.objects.create(
                type='task_assigned',
                title='New Task Assigned',
                message=notification_msg,
                link=f"/tasks/projects"
            )

            if point.assigned_to.email:
                try:
                    tenant_name = point.mom.client_name if point.mom.client_name else 'Workhub'
                    sender_domain = tenant_name.lower().replace(' ', '') + '.com'
                    
                    html_content = f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="background-color: #ffffff; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                <tr><td style="color: #64748b; padding-bottom: 5px; width: 60px;">From</td><td style="text-align: right; font-weight: 500;">notifications@{sender_domain}</td></tr>
                                <tr><td style="color: #64748b; padding-bottom: 5px;">To</td><td style="text-align: right; font-weight: 500;">{point.assigned_to.email}</td></tr>
                                <tr><td style="color: #64748b; padding-bottom: 15px;">Subject</td><td style="text-align: right; font-weight: 600;">New MOM Action Item Assigned</td></tr>
                            </table>
                        </div>
                        <div style="background-color: #ffffff; padding: 24px;">
                            <p style="font-size: 16px; margin-top: 0;">Hi {point.assigned_to.first_name or point.assigned_to.username},</p>
                            <p style="font-size: 15px; line-height: 1.5; color: #475569;">You have been assigned a new action item from the MOM meeting. Please review the task and update the status through the portal.</p>
                            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 14px;"><span style="color: #64748b; margin-right: 8px;">Task:</span> <strong style="color: #0f172a;">{point.text}</strong></p>
                                <p style="margin: 0 0 8px 0; font-size: 14px;"><span style="color: #64748b; margin-right: 8px;">Due Date:</span> <strong style="color: #0f172a;">{due_date_str}</strong></p>
                                <p style="margin: 0; font-size: 14px;"><span style="color: #64748b; margin-right: 8px;">MOM Reference:</span> <strong style="color: #0f172a;">{point.mom.title}</strong></p>
                            </div>
                            <a href="http://127.0.0.1:5173/tasks/projects" style="display: inline-block; background-color: #0265dc; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open Task in Portal</a>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">
                            &mdash; {tenant_name} Facility Management Platform
                        </div>
                    </div>
                    """
                    
                    plain_msg = f"Hi {point.assigned_to.first_name or point.assigned_to.username},\n\nYou have been assigned a new action item from the MOM meeting.\nTask: {point.text}\nDue Date: {due_date_str}\nMOM Reference: {point.mom.title}\n\nPlease review the task in the portal.\n\n— {tenant_name} Facility Management Platform"
                    
                    send_mail(
                        subject='New MOM Action Item Assigned',
                        message=plain_msg,
                        from_email=f'notifications@{sender_domain}',
                        recipient_list=[point.assigned_to.email],
                        fail_silently=True,
                        html_message=html_content
                    )
                except Exception:
                    pass

    def create(self, validated_data):
        points_data = validated_data.pop('points_data', [])
        agendas_data = validated_data.pop('agendas_data', [])
        validated_data['created_by'] = self.context['request'].user
        mom = MOM.objects.create(**validated_data)
        
        for point_data in points_data:
            assigned_to_id = point_data.get('assigned_to')
            assigned_to_user = None
            if assigned_to_id:
                try:
                    assigned_to_user = User.objects.get(id=assigned_to_id)
                except User.DoesNotExist:
                    pass
            p = MOMPoint.objects.create(
                mom=mom, 
                text=point_data.get('text', ''), 
                assigned_to=assigned_to_user,
                department=point_data.get('department'),
                priority=point_data.get('priority', 'Medium'),
                planned_date=point_data.get('planned_date'),
                actual_date=point_data.get('actual_date'),
                status=point_data.get('status', 'Open'),
                remarks=point_data.get('remarks', '')
            )
            self.handle_point_task_creation(p, self.context['request'].user)
            
        for agenda in agendas_data:
            MOMAgenda.objects.create(mom=mom, topic=agenda.get('topic', ''), remarks=agenda.get('remarks', ''))
            
        return mom

    def update(self, instance, validated_data):
        points_data = validated_data.pop('points_data', None)
        agendas_data = validated_data.pop('agendas_data', None)
        
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.meeting_date = validated_data.get('meeting_date', instance.meeting_date)
        instance.client_name = validated_data.get('client_name', instance.client_name)
        instance.site_name = validated_data.get('site_name', instance.site_name)
        instance.location = validated_data.get('location', instance.location)
        instance.start_time = validated_data.get('start_time', instance.start_time)
        instance.end_time = validated_data.get('end_time', instance.end_time)
        instance.meeting_type = validated_data.get('meeting_type', instance.meeting_type)
        instance.prepared_by = validated_data.get('prepared_by', instance.prepared_by)
        instance.meeting_status = validated_data.get('meeting_status', instance.meeting_status)
        instance.tags = validated_data.get('tags', instance.tags)
        instance.save()

        if points_data is not None:
            point_ids = [p.get('id') for p in points_data if p.get('id')]
            instance.points.exclude(id__in=point_ids).delete()
            
            for point_data in points_data:
                assigned_to_id = point_data.get('assigned_to')
                assigned_to_user = None
                if assigned_to_id:
                    try:
                        assigned_to_user = User.objects.get(id=assigned_to_id)
                    except User.DoesNotExist:
                        pass
                        
                point_id = point_data.get('id')
                if point_id:
                    p = MOMPoint.objects.get(id=point_id, mom=instance)
                    old_assignee = p.assigned_to
                    p.text = point_data.get('text', p.text)
                    p.assigned_to = assigned_to_user
                    p.department = point_data.get('department', p.department)
                    p.priority = point_data.get('priority', p.priority)
                    p.planned_date = point_data.get('planned_date', p.planned_date)
                    p.actual_date = point_data.get('actual_date', p.actual_date)
                    p.status = point_data.get('status', p.status)
                    p.remarks = point_data.get('remarks', p.remarks)
                    p.save()
                    self.handle_point_task_creation(p, self.context['request'].user, old_assignee)
                else:
                    p = MOMPoint.objects.create(
                        mom=instance,
                        text=point_data.get('text', ''),
                        assigned_to=assigned_to_user,
                        department=point_data.get('department'),
                        priority=point_data.get('priority', 'Medium'),
                        planned_date=point_data.get('planned_date'),
                        actual_date=point_data.get('actual_date'),
                        status=point_data.get('status', 'Open'),
                        remarks=point_data.get('remarks', '')
                    )
                    self.handle_point_task_creation(p, self.context['request'].user)

        if agendas_data is not None:
            instance.agendas.all().delete()
            for agenda in agendas_data:
                MOMAgenda.objects.create(mom=instance, topic=agenda.get('topic', ''), remarks=agenda.get('remarks', ''))

        return instance
