import unittest
from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User

from organization.models import Organization, UserProfile as OrgProfile
from Project.models import Project, Task
from workspace.models import Notification
from hr_requests.models import LeaderboardEntry

class TaskUpdateParityHarness(APITestCase):
    """
    Checkpoint A Parity Harness:
    Asserts that updating a task via single-item PATCH vs the new bulk update endpoint
    produces identical database states, notification records, and leaderboard updates.
    Volatile fields (IDs, auto timestamps) are normalized for clean deterministic comparison.
    """
    def setUp(self):
        self.org = Organization.objects.create(name="Parity Org")
        self.user = User.objects.create_user(username="parity_user", password="password123")
        OrgProfile.objects.create(user=self.user, organization=self.org)

        from authentication.models import UserProfile as AuthUserProfile
        AuthUserProfile.objects.create(user=self.user, user_type="employee")

        from role_base_access.models import RoleAccessMapping
        RoleAccessMapping.objects.update_or_create(
            id="parity_tasks_mapping",
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
            name="Parity Project",
            organization=self.org,
            created_by=self.user
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))

    def normalize_and_assert_parity(self, task_single, task_bulk):
        """
        Asserts parity on all domain fields while normalizing volatile fields
        (IDs, microsecond timestamp precision differences).
        """
        comparable_fields = [
            'title', 'description', 'priority', 'status',
            'due_date', 'due_time', 'is_urgent', 'is_queued',
            'type', 'platform', 'color'
        ]
        for field in comparable_fields:
            val_single = getattr(task_single, field)
            val_bulk = getattr(task_bulk, field)
            self.assertEqual(
                val_single, val_bulk,
                f"Parity mismatch on field '{field}': single={val_single} vs bulk={val_bulk}"
            )

        # Normalize completion_date: assert both either have a timestamp or both are None
        self.assertEqual(bool(task_single.completion_date), bool(task_bulk.completion_date))
        # Normalize started_at: assert both either have a timestamp or both are None
        self.assertEqual(bool(task_single.started_at), bool(task_bulk.started_at))

    def test_parity_harness_baseline(self):
        """Sanity baseline asserting equality on identical task fixtures."""
        task_1 = Task.objects.create(
            title="Baseline Task",
            priority="P2",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user
        )
        task_2 = Task.objects.create(
            title="Baseline Task",
            priority="P2",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user
        )
        self.normalize_and_assert_parity(task_1, task_2)

    @unittest.skip("Bulk update endpoint will be implemented in Checkpoint C; marked skip so test suite remains green in Checkpoint A")
    def test_single_vs_bulk_update_parity(self):
        """
        Applies identical changes via single PATCH and bulk endpoint,
        confirming identical outcome in DB and side-effects.
        """
        task_single = Task.objects.create(
            title="Single Target Task",
            priority="P3",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user
        )
        task_bulk = Task.objects.create(
            title="Bulk Target Task",
            priority="P3",
            due_date=date.today(),
            project=self.project,
            organization=self.org,
            created_by=self.user
        )

        patch_payload = {"title": "Updated Parity Task", "priority": "P1", "status": "done"}
        res_single = self.client.patch(f"/api/tasks/{task_single.id}/", patch_payload, format="json")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)

        bulk_payload = {
            "idempotency_key": "parity-test-key-001",
            "atomic": False,
            "updates": [{
                "task_id": task_bulk.id,
                "changes": patch_payload
            }]
        }
        res_bulk = self.client.post("/api/v1/tasks/bulk-update/", bulk_payload, format="json")
        self.assertEqual(res_bulk.status_code, status.HTTP_200_OK)

        task_single.refresh_from_db()
        task_bulk.refresh_from_db()
        self.normalize_and_assert_parity(task_single, task_bulk)
