from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from organization.models import Organization, UserProfile as OrgProfile
from Project.models import Project, Task
from workspace.models import Notification
from hr_requests.models import LeaderboardEntry
from boards.models import Board, Card

class GoldenSingleTaskUpdateTest(APITestCase):
    """
    Phase 1 Safety Net: Golden Tests locking current single-update behavior.
    These tests verify untouched behavior: validation, permissions, queue transitions,
    signals, notifications, and leaderboard scoring.
    """
    def setUp(self):
        # 1. Organization & Users
        self.org = Organization.objects.create(name="Golden Test Org")
        self.user_a = User.objects.create_user(username="golden_user_a", password="password123")
        self.user_b = User.objects.create_user(username="golden_user_b", password="password123")
        
        OrgProfile.objects.create(user=self.user_a, organization=self.org)
        OrgProfile.objects.create(user=self.user_b, organization=self.org)

        from authentication.models import UserProfile as AuthUserProfile
        AuthUserProfile.objects.create(user=self.user_a, user_type="employee")
        AuthUserProfile.objects.create(user=self.user_b, user_type="employee")

        # 2. RBAC Module Mapping for 'user' role with edit/view/create permissions
        from role_base_access.models import RoleAccessMapping
        RoleAccessMapping.objects.update_or_create(
            id="golden_tasks_mapping",
            defaults={
                "frontend_site_id": "tasks-projects",
                "site_name": "Tasks",
                "role": "user",
                "title": "Tasks and Projects",
                "organization": self.org,
                "permissions": {"view": True, "create": True, "edit": True, "delete": True}
            }
        )

        # 3. Project
        self.project = Project.objects.create(
            name="Golden Test Project",
            organization=self.org,
            created_by=self.user_a,
            department="Engineering"
        )

        # 4. Authenticate as User A and supply tenant header
        self.client.force_authenticate(user=self.user_a)
        self.client.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))

    def test_single_update_basic_fields(self):
        """Updating title, priority, and description works via standard endpoint."""
        task = Task.objects.create(
            title="Initial Title",
            priority="P3",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        url = f"/api/tasks/{task.id}/"
        payload = {
            "title": "Updated Title",
            "priority": "P1",
            "description": "Updated Description"
        }
        res = self.client.patch(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.title, "Updated Title")
        self.assertEqual(task.priority, "P1")
        self.assertEqual(task.description, "Updated Description")

    def test_single_update_completion_sets_completion_date_and_leaderboard(self):
        """Completing a task records completion_date and awards +10 leaderboard points."""
        task = Task.objects.create(
            title="Task to Complete",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        initial_entry = LeaderboardEntry.objects.filter(user=self.user_a).first()
        initial_points = initial_entry.points if initial_entry else 0

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertIn(task.status, ["done", "completed"])
        self.assertIsNotNone(task.completion_date)

        # Leaderboard should have awarded 10 points
        entry = LeaderboardEntry.objects.get(user=self.user_a)
        self.assertEqual(entry.points, initial_points + 10)

    def test_single_update_blocking_dependency_blocks_completion(self):
        """Task cannot be completed if an unresolved blocking dependency exists."""
        blocker = Task.objects.create(
            title="Blocker Task",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a
        )
        task = Task.objects.create(
            title="Blocked Task",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a
        )
        task.blocking_dependencies.add(blocker)

        url = f"/api/tasks/{task.id}/"
        # Task.save() raises ValidationError when blocking dependencies are unresolved
        with self.assertRaises(ValidationError):
            self.client.patch(url, {"status": "done"}, format="json")

        task.refresh_from_db()
        self.assertNotEqual(task.status, "done")

    def test_single_update_queue_limit_and_auto_promotion(self):
        """
        When completing an active task, the user's oldest queued task
        is promoted automatically to in_progress with is_queued=False.
        """
        # Set max active tasks to 1 so the second task stays queued
        self.org.advanced_settings = {"max_active_tasks": 1}
        self.org.save()

        # Create active task
        active_task = Task.objects.create(
            title="Active Task",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a,
            is_queued=False
        )
        # Create queued task
        queued_task = Task.objects.create(
            title="Queued Task",
            status="pending",
            due_date=date.today() + timedelta(days=2),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a,
            is_queued=True
        )

        url = f"/api/tasks/{active_task.id}/"
        res = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        queued_task.refresh_from_db()
        self.assertFalse(queued_task.is_queued)
        self.assertEqual(queued_task.status, "in_progress")

    def test_single_update_reassign_creates_notification(self):
        """Reassigning a task creates a notification for the new assignee."""
        task = Task.objects.create(
            title="Task for Notification",
            status="pending",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"assigned_to": self.user_b.id, "taskType": "assign", "assigneeIds": [self.user_b.id]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        notification = Notification.objects.filter(user=self.user_b, type="task_assigned").first()
        self.assertIsNotNone(notification)
        self.assertIn("Task for Notification", notification.message)

    def test_single_update_tenant_isolation(self):
        """Users cannot update tasks belonging to another organization."""
        other_org = Organization.objects.create(name="Foreign Org")
        other_user = User.objects.create_user(username="foreign_user", password="password123")
        OrgProfile.objects.create(user=other_user, organization=other_org)

        foreign_project = Project.objects.create(
            name="Foreign Project",
            organization=other_org,
            created_by=other_user
        )
        foreign_task = Task.objects.create(
            title="Foreign Task",
            due_date=date.today(),
            project=foreign_project,
            organization=other_org,
            created_by=other_user
        )

        # User A attempts to update foreign task
        url = f"/api/tasks/{foreign_task.id}/"
        res = self.client.patch(url, {"title": "Hacked Title"}, format="json")
        # Per tenant isolation rules, must return 404 (not found in tenant scope)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_single_update_non_project_task_syncs_to_card_and_meeting(self):
        """Updating a task without a parent project triggers Card and Meeting sync."""
        from calendar_meeting.models import Meeting
        global_task = Task.objects.create(
            title="Personal Global Task",
            due_date=date.today(),
            project=None, # Non-project task
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a,
            status="pending"
        )

        url = f"/api/tasks/{global_task.id}/"
        res = self.client.patch(url, {"title": "Renamed Personal Task", "status": "in_progress"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Check Board Card was synced
        card = Card.objects.filter(title="Renamed Personal Task", assignee=self.user_a).first()
        self.assertIsNotNone(card)

        # Check Meeting was synced
        meeting = Meeting.objects.filter(title="Renamed Personal Task", organizer=self.user_a).first()
        self.assertIsNotNone(meeting)

    def test_single_update_assignees_m2m_notify_signal(self):
        """Adding users to assignees m2m triggers notify_on_task_assignees signal."""
        task = Task.objects.create(
            title="Team Task",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a
        )

        # Clear existing notifications
        Notification.objects.filter(user=self.user_b).delete()

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"assigneeIds": [self.user_b.id]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        notif = Notification.objects.filter(user=self.user_b, type="task").first()
        self.assertIsNotNone(notif)
        self.assertIn("You have been added to task", notif.message)

    def test_single_update_started_at_set_on_in_progress(self):
        """Moving a task to in_progress initializes started_at timestamp."""
        task = Task.objects.create(
            title="Pending to Progress Task",
            status="pending",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a,
            started_at=None
        )

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"status": "in_progress"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.status, "in_progress")
        self.assertIsNotNone(task.started_at)

    def test_single_update_validation_error_shape(self):
        """Invalid date or payload shape returns HTTP 400 with field errors dictionary."""
        task = Task.objects.create(
            title="Validation Task",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a
        )

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"due_date": "not-a-valid-date"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("due_date" in res.data or "error" in res.data or "details" in res.data)

    def test_single_update_legacy_endpoint_parity(self):
        """Legacy endpoint PATCH /api/projects/tasks/<id>/ updates task and creates TeamActivity."""
        from workspace.models import TeamActivity
        task = Task.objects.create(
            title="Legacy Target Task",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        legacy_url = f"/api/projects/tasks/{task.id}/"
        res = self.client.patch(legacy_url, {"title": "Legacy Renamed Title"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.title, "Legacy Renamed Title")

        activity = TeamActivity.objects.filter(user=self.user_a, action="updated task").first()
        self.assertIsNotNone(activity)

    def test_single_update_department_denial_response(self):
        """User from a different department without global access receives 404 (filtered out of queryset)."""
        from authentication.models import Role as AuthRole, UserProfile as AuthUserProfile
        from role_base_access.models import Role as RBACRole

        finance_auth_role = AuthRole.objects.create(name="Finance")
        finance_rbac_role = RBACRole.objects.create(name="Finance", code="FIN", cross_department_access=False, organization=self.org)
        user_finance = User.objects.create_user(username="finance_only_user", password="password123")
        OrgProfile.objects.create(user=user_finance, organization=self.org)
        AuthUserProfile.objects.create(user=user_finance, role_relationship=finance_auth_role, user_type="employee")

        # Project belongs strictly to "Engineering"
        eng_task = Task.objects.create(
            title="Engineering Secret Task",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        client_finance = self.client_class()
        client_finance.force_authenticate(user=user_finance)
        client_finance.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))
        res = client_finance.patch(f"/api/tasks/{eng_task.id}/", {"title": "Attempted Hack"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", res.data)

    def test_single_update_rbac_denial_response(self):
        """User lacking RBAC module permission receives 403 Forbidden with standard detail."""
        from authentication.models import Role as AuthRole, UserProfile as AuthUserProfile
        from role_base_access.models import Role as RBACRole, RoleAccessMapping

        restricted_auth_role = AuthRole.objects.create(name="RestrictedRole")
        restricted_rbac_role = RBACRole.objects.create(name="RestrictedRole", code="RESTRICTED", cross_department_access=False, organization=self.org)
        user_restricted = User.objects.create_user(username="restricted_user", password="password123")
        OrgProfile.objects.create(user=user_restricted, organization=self.org)
        AuthUserProfile.objects.create(user=user_restricted, role_relationship=restricted_auth_role, user_type="employee")

        # Explicitly configure RoleAccessMapping for 'restrictedrole' with edit=False
        RoleAccessMapping.objects.create(
            id="restricted_tasks_mapping",
            frontend_site_id="tasks-projects",
            site_name="Tasks",
            role="restrictedrole",
            title="Tasks and Projects Restricted",
            organization=self.org,
            permissions={"view": False, "create": False, "edit": False, "delete": False}
        )

        rbac_target_task = Task.objects.create(
            title="RBAC Target Task",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        client_restricted = self.client_class()
        client_restricted.force_authenticate(user=user_restricted)
        client_restricted.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))
        res = client_restricted.patch(f"/api/tasks/{rbac_target_task.id}/", {"title": "Blocked"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", res.data)

    def test_single_update_real_queue_limit_rejection_path(self):
        """When an assignee reaches their max active task limit, new assignment is pushed to queue."""
        # Set organization max active tasks limit to 1
        self.org.advanced_settings = {"max_active_tasks": 1}
        self.org.save()

        # User B already has 1 active task
        active_task_b = Task.objects.create(
            title="Active Task for B",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_b,
            is_queued=False
        )

        # User A creates a second task and tries to assign to User B
        new_task = Task.objects.create(
            title="Second Task for B",
            status="pending",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user_a,
            assigned_to=self.user_a
        )

        url = f"/api/tasks/{new_task.id}/"
        res = self.client.patch(url, {"assigned_to": self.user_b.id, "status": "in_progress"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        new_task.refresh_from_db()
        # Active limit (1) was exceeded, so Task.save() forces is_queued=True and status='pending'
        self.assertTrue(new_task.is_queued)
        self.assertEqual(new_task.status, "pending")


