from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import HRRequest, HRRequestLog, AttendanceRecord, LeaderboardEntry
from .serializers import HRRequestSerializer, AttendanceRecordSerializer, LeaderboardEntrySerializer
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from .utils import get_hr_permissions, get_team_users
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.decorators import action

class HRRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = HRRequestSerializer

    def get_queryset(self):
        user = self.request.user
        perms = get_hr_permissions(user)
        view_scope = perms.get('view', 'none')

        if view_scope == 'none':
            return HRRequest.objects.none()

        if view_scope == 'all':
            return HRRequest.objects.all().order_by('-created_at')

        if view_scope == 'team':
            team_users = get_team_users(user)
            return HRRequest.objects.filter(Q(user=user) | Q(user__in=team_users)).distinct().order_by('-created_at')

        # 'own' scope
        return HRRequest.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        perms = get_hr_permissions(user)
        create_scope = perms.get('create', 'none')

        if create_scope == 'none':
            raise PermissionDenied("You do not have permission to create HR requests.")

        target_user = serializer.validated_data.get('user', user)
        if target_user is None:
            target_user = user

        if create_scope == 'own' and target_user != user:
            raise PermissionDenied("You can only create requests for yourself.")

        if create_scope == 'team' and target_user != user:
            team_users = get_team_users(user)
            if not team_users.filter(id=target_user.id).exists():
                raise PermissionDenied("You can only create requests for your team members.")

        hr_request = serializer.save(user=target_user)
        
        HRRequestLog.objects.create(
            hr_request=hr_request,
            actor=user,
            action='created',
            note='Request created successfully.'
        )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        user = self.request.user
        perms = get_hr_permissions(user)
        edit_scope = perms.get('edit', 'none')

        if edit_scope == 'none':
            raise PermissionDenied("You do not have permission to edit HR requests.")

        if edit_scope == 'own' and old_instance.user != user:
            raise PermissionDenied("You can only edit your own requests.")

        if edit_scope == 'team' and old_instance.user != user:
            team_users = get_team_users(user)
            if old_instance.user and not team_users.filter(id=old_instance.user.id).exists():
                raise PermissionDenied("You can only edit requests of your team members.")

        new_status = serializer.validated_data.get('status', old_instance.status)
        if old_instance.status != new_status:
            if old_instance.user == user:
                raise PermissionDenied("You cannot approve or reject your own request.")

        updated_instance = serializer.save()
        
        if old_instance.status != new_status:
            HRRequestLog.objects.create(
                hr_request=updated_instance,
                actor=user,
                action='status_changed',
                note=f'Status changed to {new_status}'
            )

    def perform_destroy(self, instance):
        user = self.request.user
        perms = get_hr_permissions(user)
        edit_scope = perms.get('edit', 'none')

        if edit_scope == 'none':
            raise PermissionDenied("You do not have permission to delete HR requests.")

        if edit_scope == 'own' and instance.user != user:
            raise PermissionDenied("You can only delete your own requests.")

        if edit_scope == 'team' and instance.user != user:
            team_users = get_team_users(user)
            if instance.user and not team_users.filter(id=instance.user.id).exists():
                raise PermissionDenied("You can only delete requests of your team members.")

        instance.delete()

class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        users = User.objects.all()
        data = []
        for u in users:
            records = AttendanceRecord.objects.filter(user=u).order_by('date')
            data.append({
                'id': u.id,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email_id': u.email,
                'mobile': '',
                'profile_photo': None,
                'user_type': getattr(u, 'auth_profile', None).role if getattr(u, 'auth_profile', None) else 'employee',
                'vibe_id': str(u.id),
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'attendance_records': AttendanceRecordSerializer(records, many=True).data
            })
        return Response({'results': data})

class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LeaderboardEntrySerializer
    queryset = LeaderboardEntry.objects.all().order_by('-points')