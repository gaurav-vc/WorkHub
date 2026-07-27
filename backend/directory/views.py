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


    def get_queryset(self):

        return Employee.objects.all().order_by('name')
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
        
        # Get organization logo if available
        org_logo_url = ""
        if employee.organization and employee.organization.logo:
            org_logo_url = request.build_absolute_uri(employee.organization.logo.url)
            
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700&display=swap');
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Inter', sans-serif;">
            <!-- Background pattern container -->
            <div style="background-image: url('https://www.transparenttextures.com/patterns/cubes.png'); padding: 40px 20px;">
                
                <!-- Main Card -->
                <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f26f21 0%, #8b3484 100%); position: relative; overflow: hidden; transform: skewY(-2deg); padding: 50px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                    <div style="transform: skewY(2deg); text-align: center; position: relative; z-index: 2;">
                        
                        <!-- Top Right Logo -->
                        <div style="position: absolute; top: -30px; right: 20px;">
                            {f'<img src="{org_logo_url}" alt="Company Logo" style="height: 40px; background: white; padding: 5px; border-radius: 4px;"/>' if org_logo_url else ''}
                        </div>
                        
                        <!-- Happy Birthday Text -->
                        <div style="margin-top: 20px;">
                            <h3 style="margin: 0; color: #000; font-size: 20px; font-weight: 700;">Happy</h3>
                            <h1 style="margin: -10px 0 20px 0; color: #fff; font-family: 'Great Vibes', cursive; font-size: 64px; font-weight: 400;">Birthday</h1>
                        </div>
                        
                        <!-- Employee Photo -->
                        <div style="margin: 20px auto;">
                            {f'<img src="{photo_url}" alt="Profile Photo" style="width: 200px; height: 200px; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"/>' if photo_url else '<div style="width: 200px; height: 200px; background: rgba(255,255,255,0.2); margin: 0 auto; border: 4px solid white;"></div>'}
                        </div>
                        
                        <!-- Employee Name -->
                        <h2 style="color: white; font-size: 32px; font-weight: 700; margin: 20px 0 10px 0; letter-spacing: 0.5px;">
                            {employee.name}
                        </h2>
                        
                        <!-- Wishes -->
                        <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5; max-width: 80%; margin: 0 auto 20px auto;">
                            Wishing you a fantastic birthday<br/>
                            filled with joy, success, and<br/>
                            wonderful moments!
                        </p>
                    </div>
                </div>
                
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