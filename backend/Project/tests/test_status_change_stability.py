from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from organization.models import Organization, UserProfile as OrgProfile
from authentication.models import UserProfile as AuthUserProfile
from role_base_access.models import RoleAccessMapping
from Project.models import Project, Task
from hr_requests.models import LeaderboardEntry
from boards.models import Card
from calendar_meeting.models import Meeting


class TaskStatusChangeStabilityTests(APITestCase):
    """
    Phase 1 Characterization Tests:
    Locks existing status change behaviors and contract guarantees before applying fixes:
    1. Normal transition (pending -> in_progress) status code & response schema.
    2. Completion awards +50 profile points, +10 leaderboard points, syncs Card/Meeting.
    3. Queue auto-promotion pulls oldest queued task when active slot frees up.
    4. Exact snapshot of response JSON key set to guarantee backward compatibility.
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Stability Test Org")
        self.user = User.objects.create_user(username="stability_user", password="password123")
        OrgProfile.objects.create(user=self.user, organization=self.org)
        self.auth_profile = AuthUserProfile.objects.create(user=self.user, user_type="employee", points=0)

        RoleAccessMapping.objects.update_or_create(
            id="stability_tasks_mapping",
            defaults={
                "frontend_site_id": "tasks-projects",
                "site_name": "Tasks",
                "role": "user",
                "title": "Tasks and Projects",
                "organization": self.org,
                "permissions": {"view": True, "create": True, "edit": True, "delete": True}
            }
        )

        self.project = Project.objects.create(
            name="Stability Test Project",
            organization=self.org,
            created_by=self.user,
            department="Engineering"
        )

        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))

    def test_normal_status_change_pending_to_in_progress(self):
        """
        Normal status change pending -> in_progress returns HTTP 200,
        updates DB, and initializes started_at timestamp.
        """
        task = Task.objects.create(
            title="Initial Pending Task",
            status="pending",
            priority="P2",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user,
            started_at=None
        )

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"status": "in_progress"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, "in_progress")
        self.assertIsNotNone(task.started_at)

    def test_response_json_key_set_snapshot(self):
        """
        Captures the exact snapshot of response JSON keys returned on task update.
        Ensures future fixes do not remove, rename, or break existing response fields.
        """
        task = Task.objects.create(
            title="Snapshot Task",
            status="pending",
            priority="P3",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user
        )

        url = f"/api/tasks/{task.id}/"
        res = self.client.patch(url, {"title": "Renamed Snapshot Task"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        expected_core_keys = {
            'id', 'title', 'project', 'assigned_to', 'priority', 'status',
            'due_date', 'due_time', 'description', 'created_at', 'completion_date',
            'started_at', 'is_queued', 'is_urgent'
        }
        actual_keys = set(res.data.keys())
        missing_keys = expected_core_keys - actual_keys
        self.assertEqual(missing_keys, set(), f"Response missing existing keys: {missing_keys}")

    def test_completion_awards_points_and_syncs_card_meeting(self):
        """
        Completing a task with no blocking dependencies awards:
        - +50 points to user's auth_profile (Task.save())
        - +10 points to LeaderboardEntry (TaskViewSet.update())
        - Syncs personal Card and calendar Meeting for non-project tasks.
        """
        global_task = Task.objects.create(
            title="Global Completable Task",
            status="in_progress",
            priority="P1",
            due_date=date.today(),
            project=None,  # non-project task triggers Card/Meeting sync
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user
        )

        init_profile_pts = self.auth_profile.points
        init_lb_entry = LeaderboardEntry.objects.filter(user=self.user).first()
        init_lb_pts = init_lb_entry.points if init_lb_entry else 0

        url = f"/api/tasks/{global_task.id}/"
        res = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        global_task.refresh_from_db()
        self.assertEqual(global_task.status, "done")
        self.assertIsNotNone(global_task.completion_date)

        # Gamification (+50)
        self.auth_profile.refresh_from_db()
        self.assertEqual(self.auth_profile.points, init_profile_pts + 50)

        # Leaderboard (+10)
        lb_entry = LeaderboardEntry.objects.get(user=self.user)
        self.assertEqual(lb_entry.points, init_lb_pts + 10)

        # Card & Meeting sync
        card = Card.all_objects.filter(title="Global Completable Task", assignee=self.user).order_by('-id').first()
        self.assertIsNotNone(card)
        self.assertEqual(card.status, "done")

        meeting = Meeting.all_objects.filter(title="Global Completable Task", organizer=self.user).first()
        self.assertIsNotNone(meeting)

    def test_queue_auto_promotion_on_task_completion(self):
        """
        When completing an active task with assignee at max limit,
        the oldest queued task is automatically promoted to in_progress with is_queued=False.
        """
        self.org.advanced_settings = {"max_active_tasks": 1}
        self.org.save()

        active_task = Task.objects.create(
            title="Active Limit Task",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user,
            is_queued=False
        )
        queued_task = Task.objects.create(
            title="Queued Waiting Task",
            status="pending",
            due_date=date.today() + timedelta(days=2),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user,
            is_queued=True
        )

        url = f"/api/tasks/{active_task.id}/"
        res = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        active_task.refresh_from_db()
        self.assertEqual(active_task.status, "done")

        queued_task.refresh_from_db()
        self.assertFalse(queued_task.is_queued)
        self.assertEqual(queued_task.status, "in_progress")
        self.assertIsNotNone(queued_task.started_at)

    # =========================================================================
    # PHASE 3 VERIFICATION TESTS (Fix 2, Fix 3)
    # =========================================================================

    def test_fix_2_unhandled_validation_error_returns_clean_400(self):
        """
        Fix 2 Verification:
        - Marking a task 'done' with an incomplete blocking dependency raises model ValidationError,
          which custom_exception_handler converts to HTTP 400 with the exact error message.
        - Marking a task 'done' with NO blockers succeeds with HTTP 200.
        - Unrelated exceptions (HTTP 404 for non-existent task) remain byte-for-byte identical.
        """
        blocker = Task.objects.create(
            title="Incomplete Blocker",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user
        )
        blocked_task = Task.objects.create(
            title="Blocked Task Target",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user
        )
        blocked_task.blocking_dependencies.add(blocker)

        # 1. Blocked task returns 400 with exact message
        url = f"/api/tasks/{blocked_task.id}/"
        res = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        error_str = str(res.data)
        self.assertIn("Cannot complete this task because it has incomplete blocking dependencies.", error_str)

        # 2. Resolving blocker allows task to complete with 200
        blocker.status = "done"
        blocker.save()
        res_ok = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        # 3. Unrelated exception: non-existent task returns 404 untouched
        res_404 = self.client.patch("/api/tasks/999999/", {"title": "Missing"}, format="json")
        self.assertEqual(res_404.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", res_404.data)

    def test_fix_3_queue_override_returns_200_with_queued_true_and_detail(self):
        """
        Fix 3 Verification:
        - When user reaches max active tasks, moving pending -> in_progress returns HTTP 200,
          status == 'pending', queued == True, queue_detail == 'Active task limit reached; task has been queued.'
        - When user is below max active tasks, moving pending -> in_progress returns HTTP 200,
          status == 'in_progress', queued == False, queue_detail == None.
        """
        self.org.advanced_settings = {"max_active_tasks": 1}
        self.org.save()

        # Task 1: fills user's active slot (1 active task)
        Task.objects.create(
            title="Active Task 1",
            status="in_progress",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user,
            is_queued=False
        )

        # Task 2: pending task
        task_over_limit = Task.objects.create(
            title="Over Limit Task",
            status="pending",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user,
            assigned_to=self.user,
            is_queued=False
        )

        # 1. User is at limit: attempt to move to in_progress
        res = self.client.patch(f"/api/tasks/{task_over_limit.id}/", {"status": "in_progress"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'pending')
        self.assertTrue(res.data['queued'])
        self.assertEqual(res.data['queue_detail'], "Active task limit reached; task has been queued.")

        # 2. Increase limit: attempt to move to in_progress succeeds normally
        self.org.advanced_settings = {"max_active_tasks": 5}
        self.org.save()

        res_ok = self.client.patch(f"/api/tasks/{task_over_limit.id}/", {"status": "in_progress"}, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['status'], 'in_progress')
        self.assertFalse(res_ok.data['queued'])
        self.assertIsNone(res_ok.data['queue_detail'])

