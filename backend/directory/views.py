from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Employee
from .serializers import EmployeeSerializer
from django.conf import settings

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('name')
    serializer_class = EmployeeSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        from core.tenant import get_current_organization
        org = get_current_organization()
        if not org:
            try:
                from organization.models import Organization, UserProfile as OrgUserProfile
                org = Organization.objects.first()
                if org and self.request.user.is_authenticated:
                    op, _ = OrgUserProfile.objects.get_or_create(user=self.request.user)
                    if not op.organization:
                        op.organization = org
                        op.save()
            except Exception:
                pass
        serializer.save(organization=org)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        employee = self.get_object()
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'error': 'No photo provided'}, status=status.HTTP_400_BAD_REQUEST)
        employee.photo = photo
        employee.save()
        serializer = self.get_serializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def birthdays_today(self, request):
        today = timezone.now().date()
        # Find employees whose birthday month and day match today
        employees = Employee.objects.filter(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day
        )
        serializer = self.get_serializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_birthday_email(self, request, pk=None):
        employee = self.get_object()
        if not employee.email:
            return Response({'error': 'Employee has no email'}, status=status.HTTP_400_BAD_REQUEST)

        photo_url = request.build_absolute_uri(employee.photo.url) if employee.photo else ""
        
        # Render a nice HTML birthday template
        html_message = f"""
        <html>
            <head></head>
            <body style="font-family: Arial, sans-serif; text-align: center; background-color: #f9fafb; padding: 40px;">
                <div style="background-color: white; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <h1 style="color: #2563EB;">🎉 Happy Birthday, {employee.name}! 🎂</h1>
                    {f'<img src="{photo_url}" alt="Profile Photo" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 20px auto; border: 4px solid #34D399;"/>' if photo_url else ''}
                    <p style="color: #4B5563; font-size: 18px; line-height: 1.6;">
                        Wishing you a fantastic birthday filled with joy, laughter, and wonderful moments.
                        Thank you for all your hard work and for being an amazing part of our team!
                    </p>
                    <p style="color: #9CA3AF; margin-top: 30px; font-size: 14px;">
                        - From all of us at your company
                    </p>
                </div>
            </body>
        </html>
        """

        try:
            send_mail(
                subject=f"Happy Birthday, {employee.name}! 🎉",
                message=f"Happy Birthday {employee.name}!",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[employee.email],
                html_message=html_message,
                fail_silently=False,
            )
            return Response({'status': 'Email sent successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)