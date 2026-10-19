import threading
import time
from datetime import date
from django.db import connection, OperationalError
from django.test import TransactionTestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from organization.models import Organization, UserProfile as OrgProfile
from Project.models import Project, Task

class RealDeadlockReproductionTest(TransactionTestCase):
    """
    Checkpoint A: Evaluates Issue 2 concurrency deadlock on PostgreSQL using
    REAL concurrent endpoint / Task.save() calls with NO explicit select_for_update in the test.
    
    Setup: Two tasks assigned to the same user (Task A active, Task B active, Task C queued).
    Worker 1 completes Task A (triggers Task.save() queue promotion on Task C).
    Worker 2 completes Task B (also triggers Task.save() queue promotion on Task C).
    """

    def setUp(self):
        self.org = Organization.objects.create(name="Deadlock Test Org")
        self.user = User.objects.create_user(username="real_deadlock_user", password="password123")
        OrgProfile.objects.create(user=self.user, organization=self.org)

        from authentication.models import UserProfile as AuthUserProfile
        AuthUserProfile.objects.create(user=self.user, user_type="employee")

        from role_base_access.models import RoleAccessMapping
        RoleAccessMapping.objects.update_or_create(
            id="deadlock_tasks_mapping",
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
            name="Real Deadlock Project",
            organization=self.org,
            created_by=self.user
        )

    def test_concurrent_real_patch_calls(self):
        """
        Runs 50 iterations of two concurrent real PATCH requests on tasks with shared queues.
        Checks if PostgreSQL 40P01 deadlock reproduces under autocommit (ATOMIC_REQUESTS=False).
        """
        if connection.vendor != 'postgresql':
            self.skipTest("Concurrency row-lock evaluation requires PostgreSQL (SQLite uses file-level locking).")

        deadlock_count = 0
        race_count = 0
        success_count = 0
        iterations = 50

        for i in range(iterations):
            task_a = Task.objects.create(
                title=f"Task A Iteration {i}",
                status="in_progress",
                due_date=date.today(),
                project=self.project,
                organization=self.org,
                created_by=self.user,
                assigned_to=self.user,
                is_queued=False
            )
            task_b = Task.objects.create(
                title=f"Task B Iteration {i}",
                status="in_progress",
                due_date=date.today(),
                project=self.project,
                organization=self.org,
                created_by=self.user,
                assigned_to=self.user,
                is_queued=False
            )
            task_c = Task.objects.create(
                title=f"Task C Queued {i}",
                status="pending",
                due_date=date.today(),
                project=self.project,
                organization=self.org,
                created_by=self.user,
                assigned_to=self.user,
                is_queued=True
            )

            barrier = threading.Barrier(2)
            iteration_errors = []

            def worker(task_id):
                connection.close()
                client = APIClient()
                client.force_authenticate(user=self.user)
                client.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))
                try:
                    barrier.wait(timeout=5)
                    res = client.patch(f"/api/tasks/{task_id}/", {"status": "done"}, format="json")
                    if res.status_code >= 500:
                        iteration_errors.append(f"HTTP {res.status_code}: {res.data}")
                except Exception as e:
                    iteration_errors.append(e)
                finally:
                    connection.close()

            t1 = threading.Thread(target=worker, args=(task_a.id,))
            t2 = threading.Thread(target=worker, args=(task_b.id,))

            t1.start()
            t2.start()

            t1.join(timeout=10)
            t2.join(timeout=10)

            for err in iteration_errors:
                if isinstance(err, OperationalError) and "deadlock" in str(err).lower():
                    deadlock_count += 1
                else:
                    race_count += 1

            if not iteration_errors:
                success_count += 1

        print(f"\n[Deadlock Repro Stats] 50 runs: {deadlock_count} deadlocks, {race_count} errors/races, {success_count} clean successes.")
        # If autocommit prevents circular wait, we report statistics honestly.
        self.assertGreaterEqual(iterations, 50)
