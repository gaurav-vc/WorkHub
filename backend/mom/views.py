from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MOM, MOMPoint, MOMAttendee
from .serializers import MOMSerializer, MOMPointSerializer
from Project.models import Task
from workspace.models import Notification
from django.core.mail import send_mail, EmailMessage
from django.contrib.auth.models import User
from .utils import generate_mom_pdf

class MOMViewSet(viewsets.ModelViewSet):
    queryset = MOM.objects.all()
    serializer_class = MOMSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        mom = self.get_object()
        new_mom = MOM.objects.create(
            title=f"Copy of {mom.title}",
            description=mom.description,
            meeting_date=mom.meeting_date,
            tags=mom.tags,
            created_by=request.user,
            organization=mom.organization
        )
        
        # Clone points unassigned
        for point in mom.points.all():
            MOMPoint.objects.create(
                mom=new_mom,
                text=point.text,
                assigned_to=None
            )
            
        serializer = self.get_serializer(new_mom)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def add_attendee(self, request, pk=None):
        mom = self.get_object()
        is_external = request.data.get('is_external', False)
        
        if is_external:
            name = request.data.get('name')
            email = request.data.get('email')
            phone = request.data.get('phone')
            attendee = MOMAttendee.objects.create(mom=mom, is_external=True, name=name, email=email, phone=phone, organization=mom.organization)
            # The email will be sent later in send_notifications when the MOM is finalized.
        else:
            user_id = request.data.get('user_id')
            user = User.objects.get(id=user_id)
            attendee = MOMAttendee.objects.create(mom=mom, is_external=False, user=user, organization=mom.organization)
            
        mom = self.get_queryset().get(pk=mom.pk)
        serializer = self.get_serializer(mom)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def remove_attendee(self, request, pk=None):
        mom = self.get_object()
        attendee_id = request.data.get('attendee_id')
        try:
            attendee = MOMAttendee.objects.get(id=attendee_id, mom=mom)
            attendee.delete()
        except MOMAttendee.DoesNotExist:
            pass
        mom = self.get_queryset().get(pk=mom.pk)
        serializer = self.get_serializer(mom)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def send_notifications(self, request, pk=None):
        mom = self.get_object()
        
        # Internal attendees get in-app notifications
        internal_attendees = MOMAttendee.objects.filter(mom=mom, is_external=False)
        for att in internal_attendees:
            if att.user:
                Notification.objects.create(
                    type='mom_update',
                    title='MOM Finalized',
                    message=f"The Minutes of Meeting '{mom.title}' has been finalized and you are listed as an attendee.",
                    link=f"/tasks/mom/{mom.id}"
                )

        # External attendees get the PDF via email
        external_attendees = MOMAttendee.objects.filter(mom=mom, is_external=True).exclude(email__isnull=True).exclude(email__exact='')
        if external_attendees.exists():
            try:
                pdf_bytes = generate_mom_pdf(mom)
                for att in external_attendees:
                    msg = EmailMessage(
                        subject=f'Minutes of Meeting: {mom.title}',
                        body=f"Hello {att.name},\n\nPlease find attached the final Minutes of Meeting for '{mom.title}'.\n\nBest,\nTeam WorkHub",
                        from_email='no-reply@company.local',
                        to=[att.email],
                    )
                    msg.attach(f'MOM-{mom.id}.pdf', pdf_bytes, 'application/pdf')
                    msg.send(fail_silently=True)
            except Exception as e:
                print(f"Error sending finalized MOM email: {e}")
                return Response({'detail': 'Failed to send external emails.', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'Notifications sent successfully.'}, status=status.HTTP_200_OK)

class MOMPointViewSet(viewsets.ModelViewSet):
    queryset = MOMPoint.objects.all()
    serializer_class = MOMPointSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def convert_to_task(self, request, pk=None):
        point = self.get_object()
        if point.is_task_converted:
            return Response({'detail': 'Already converted to task.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not point.assigned_to:
            return Response({'detail': 'Point must be assigned to a user before converting to a task.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create Task
        task = Task.objects.create(
            title=f"MOM Task: {point.mom.title}",
            description=f"From MOM '{point.mom.title}' - Point: {point.text}",
            assigned_to=point.assigned_to,
            created_by=request.user,
            due_date=point.mom.meeting_date,
            status='open'
        )
        
        # Create Card to reflect in MyDay, Dashboard, and MyBoards
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
        
        # Map priority
        priority_map = {
            'High': 'P2',
            'Medium': 'P3',
            'Low': 'P4'
        }
        card_priority = priority_map.get(point.priority, 'P3')

        Card.objects.create(
            title=f"MOM Task: {point.text[:50]}",
            description=f"From MOM '{point.mom.title}'\n\nPoint: {point.text}",
            priority=card_priority,
            status='pending',
            column=column,
            assignee=point.assigned_to,
            created_by=request.user,
            due_date=point.planned_date or point.mom.meeting_date
        )

        point.is_task_converted = True
        point.task = task
        point.save()

        # Create Notification
        Notification.objects.create(
            type='task_assigned',
            title='New Task from MOM',
            message=f"You have been assigned a task from the MOM '{point.mom.title}'.",
            link=f"/tasks/projects" # Or deep link
        )

        # Send Email
        if point.assigned_to.email:
            try:
                send_mail(
                    subject='New Task Assigned from MOM',
                    message=f"Hello {point.assigned_to.username},\n\nYou have been assigned a new task from the Minutes of Meeting: '{point.mom.title}'.\n\nTask details:\n{point.text}\n\nPlease check your dashboard.\n\nBest,\nSystem",
                    from_email='no-reply@company.local',
                    recipient_list=[point.assigned_to.email],
                    fail_silently=True,
                )
            except Exception:
                pass
                
        return Response({'detail': 'Task created successfully', 'task_id': task.id}, status=status.HTTP_200_OK)
