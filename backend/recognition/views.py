from rest_framework import viewsets
from rest_framework.decorators import action
from .models import Kudos, Birthday
from .serializers import KudosSerializer, BirthdaySerializer

class KudosViewSet(viewsets.ModelViewSet):
    queryset = Kudos.objects.all().order_by('-created_at')
    serializer_class = KudosSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        profile = getattr(user, 'auth_profile', None)
        
        # Admins and managers can see all kudos
        if profile and profile.user_type in ['super_user', 'site_admin', 'manager']:
            return qs
            
        # Standard employees can only see their own kudos
        from django.db.models import Q
        full_name = user.get_full_name() or user.username
        return qs.filter(Q(to_name__icontains=full_name) | Q(from_name__icontains=full_name))

class BirthdayViewSet(viewsets.ReadOnlyModelViewSet):
    # ReadOnly because Birthdays are usually managed by HR/Admin, not created by users directly
    queryset = Birthday.objects.all()
    serializer_class = BirthdaySerializer

    def list(self, request, *args, **kwargs):
        from directory.models import Employee
        from rest_framework.response import Response
        import datetime
        
        from core.tenant import get_current_organization
        
        today = datetime.date.today()
        org = get_current_organization()
        
        # Get employees in this org with a date_of_birth
        if org:
            employees = Employee.objects.filter(date_of_birth__isnull=False, organization=org)
        else:
            employees = Employee.objects.filter(date_of_birth__isnull=False)
        
        results = []
        for emp in employees:
            if not emp.date_of_birth: continue
            
            # If birthday is upcoming this month or next
            month_diff = emp.date_of_birth.month - today.month
            
            # Adjust for end of year
            if month_diff < 0:
                month_diff += 12
                
            if month_diff == 0:
                day_diff = emp.date_of_birth.day - today.day
                if day_diff >= 0:
                    results.append({
                        "id": emp.id,
                        "name": emp.name,
                        "initials": emp.initials,
                        "department": emp.department,
                        "date_string": emp.date_of_birth.strftime("%b %d"),
                        "day_number": emp.date_of_birth.day,
                        "days_left": day_diff
                    })
            elif month_diff == 1:
                # Next month
                import calendar
                _, days_in_month = calendar.monthrange(today.year, today.month)
                day_diff = (days_in_month - today.day) + emp.date_of_birth.day
                results.append({
                    "id": emp.id,
                    "name": emp.name,
                    "initials": emp.initials,
                    "department": emp.department,
                    "date_string": emp.date_of_birth.strftime("%b %d"),
                    "day_number": emp.date_of_birth.day,
                    "days_left": day_diff
                })
                
        results.sort(key=lambda x: x['days_left'])
        return Response(results)

    @action(detail=False, methods=['post'])
    def trigger_birthdays(self, request):
        from django.core.management import call_command
        try:
            call_command('check_birthdays')
            return Response({"status": "Success", "message": "Triggered birthday check successfully."})
        except Exception as e:
            return Response({"status": "Error", "message": str(e)}, status=500)