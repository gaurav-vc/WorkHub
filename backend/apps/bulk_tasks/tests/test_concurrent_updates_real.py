import os
import sys
import tempfile
import time
import traceback
import statistics
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor
import threading

import django
from django.conf import settings
from django.db import connection, connections
from django.test import TransactionTestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

# Ensure SQLite test database uses a real file on disk so threads share database locks
TEST_DB_FILE = os.path.join(tempfile.gettempdir(), f"workhub_concurrent_{os.getpid()}.sqlite3")
if 'default' in settings.DATABASES and settings.DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
    settings.DATABASES['default'].setdefault('TEST', {})['NAME'] = TEST_DB_FILE

from organization.models import Organization, UserProfile as OrgProfile
from authentication.models import UserProfile as AuthUserProfile, Role as AuthRole
from role_base_access.models import RoleAccessMapping, Role as RBACRole
from Project.models import Project, Task
from workspace.models import Notification
from hr_requests.models import LeaderboardEntry
from boards.models import Card
from calendar_meeting.models import Meeting


class SQLiteConcurrentUpdateRealBenchmark(TransactionTestCase):
    """
    Real Concurrency Benchmark on SQLite:
    Executes real concurrent HTTP PATCH /api/tasks/<id>/ requests via ThreadPoolExecutor + Barrier.
    
    Scenarios:
    1. N different tasks, same user, one request per task (priority/title).
    2. Complete N tasks at the same time, same assignee, with queued tasks waiting (queue promotion).
    3. Mixed fields per task (status, priority, due_date, assigned_to).
    4. Same task, 10 simultaneous requests with different fields (lost-update check).
    5. 5 users each updating their own tasks simultaneously.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        print("\n" + "=" * 90)
        print("SQLITE CONCURRENCY DIAGNOSTIC: READ-ONLY DATABASE ENVIRONMENT CHECK")
        print("=" * 90)
        print(f"Django Version        : {django.get_version()}")
        print(f"Database Engine       : {connection.settings_dict.get('ENGINE')}")
        print(f"Test Database File    : {connection.settings_dict.get('NAME')}")

        with connection.cursor() as cursor:
            try:
                cursor.execute("PRAGMA journal_mode;")
                journal_mode = cursor.fetchone()[0]
            except Exception as e:
                journal_mode = f"Error: {e}"
            try:
                cursor.execute("PRAGMA busy_timeout;")
                busy_timeout = cursor.fetchone()[0]
            except Exception as e:
                busy_timeout = f"Error: {e}"
            try:
                cursor.execute("PRAGMA synchronous;")
                synchronous = cursor.fetchone()[0]
            except Exception as e:
                synchronous = f"Error: {e}"

        print(f"PRAGMA journal_mode   : {journal_mode}")
        print(f"PRAGMA busy_timeout   : {busy_timeout} ms")
        print(f"PRAGMA synchronous    : {synchronous}")
        db_options = connection.settings_dict.get('OPTIONS', {})
        print(f"Database OPTIONS      : {db_options}")
        print(f"CONN_MAX_AGE          : {connection.settings_dict.get('CONN_MAX_AGE')}")
        print(f"ATOMIC_REQUESTS       : {connection.settings_dict.get('ATOMIC_REQUESTS', False)}")
        print("=" * 90 + "\n")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        connections.close_all()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def setUp(self):
        self.org = Organization.objects.create(name="SQLite Concurrency Org")
        self.users = []
        for i in range(5):
            u = User.objects.create_user(username=f"sql_user_{i}", password="password123")
            OrgProfile.objects.create(user=u, organization=self.org)
            AuthUserProfile.objects.create(user=u, user_type="employee")
            self.users.append(u)

        self.primary_user = self.users[0]

        RoleAccessMapping.objects.update_or_create(
            id="sqlite_tasks_mapping",
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
            name="SQLite Concurrency Project",
            organization=self.org,
            created_by=self.primary_user,
            department="Engineering"
        )

    def _execute_concurrent_batch(self, operations):
        """
        Executes a list of operations concurrently using ThreadPoolExecutor and Barrier.
        Each operation is a dict: {'user': User, 'task_id': int, 'payload': dict, 'expected': dict}
        """
        n_ops = len(operations)
        barrier = threading.Barrier(n_ops)
        results = []

        def worker(op):
            connections.close_all()
            client = APIClient()
            client.force_authenticate(user=op['user'])
            client.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.id))

            task_id = op['task_id']
            payload = op['payload']
            status_code = None
            resp_data = None
            err_type = None
            err_msg = None
            err_tb = None
            elapsed_ms = 0.0

            try:
                barrier.wait(timeout=20)
                start_t = time.perf_counter()
                res = client.patch(f"/api/tasks/{task_id}/", payload, format="json")
                elapsed_ms = (time.perf_counter() - start_t) * 1000
                status_code = res.status_code
                resp_data = getattr(res, 'data', None)
                if status_code >= 400:
                    err_type = f"HTTP_{status_code}"
                    err_msg = str(resp_data)
            except Exception as e:
                err_type = type(e).__name__
                err_msg = str(e)
                err_tb = traceback.format_exc()
            finally:
                connections.close_all()

            return {
                "task_id": task_id,
                "payload": payload,
                "expected": op.get('expected', {}),
                "status_code": status_code,
                "resp_data": resp_data,
                "elapsed_ms": elapsed_ms,
                "err_type": err_type,
                "err_msg": err_msg,
                "err_tb": err_tb
            }

        with ThreadPoolExecutor(max_workers=min(n_ops, 64)) as executor:
            futures = [executor.submit(worker, op) for op in operations]
            for f in futures:
                results.append(f.result())

        return results

    # =========================================================================
    # SCENARIO 1: N different tasks, same user, one request per task
    # =========================================================================
    def _run_scenario_1(self, n_tasks, runs=30):
        latencies = []
        failures = 0
        failure_types = {}
        sample_tracebacks = []
        silent_lost_updates = 0
        total_requests = n_tasks * runs

        start_wall = time.perf_counter()
        for run_idx in range(runs):
            tasks = [
                Task.objects.create(
                    title=f"S1_N{n_tasks}_R{run_idx}_T{i}",
                    priority="P3",
                    status="in_progress",
                    due_date=date.today(),
                    project=self.project,
                    organization=self.org,
                    created_by=self.primary_user,
                    assigned_to=self.primary_user
                ) for i in range(n_tasks)
            ]

            ops = [{
                'user': self.primary_user,
                'task_id': t.id,
                'payload': {'title': f"S1_UPDATED_{t.id}", 'priority': 'P1'},
                'expected': {'title': f"S1_UPDATED_{t.id}", 'priority': 'P1'}
            } for t in tasks]

            res_list = self._execute_concurrent_batch(ops)

            for r in res_list:
                if r['status_code'] == 200:
                    latencies.append(r['elapsed_ms'])
                else:
                    failures += 1
                    key = r['err_type'] or f"HTTP_{r['status_code']}"
                    failure_types[key] = failure_types.get(key, 0) + 1
                    if len(sample_tracebacks) < 3 and r['err_tb']:
                        sample_tracebacks.append((r['task_id'], r['err_type'], r['err_msg'], r['err_tb']))

            # Verify against database
            for t in tasks:
                t.refresh_from_db()
                if t.priority != 'P1' or not t.title.startswith("S1_UPDATED_"):
                    silent_lost_updates += 1

            Task.objects.filter(id__in=[t.id for t in tasks]).delete()

        wall_time = time.perf_counter() - start_wall
        return {
            "scenario": f"Scenario 1: N={n_tasks} tasks (same user)",
            "n": n_tasks,
            "runs": runs,
            "total_reqs": total_requests,
            "success_pct": round(((total_requests - failures) / total_requests) * 100, 1),
            "failure_pct": round((failures / total_requests) * 100, 1),
            "failures": failures,
            "failure_types": failure_types if failure_types else "None",
            "avg_lat": round(statistics.mean(latencies), 1) if latencies else 0.0,
            "max_lat": round(max(latencies), 1) if latencies else 0.0,
            "silent_lost_updates": silent_lost_updates,
            "wall_time_sec": round(wall_time, 2),
            "sample_tracebacks": sample_tracebacks
        }

    # =========================================================================
    # SCENARIO 2: Complete N tasks simultaneously, same assignee, queued waiting
    # =========================================================================
    def _run_scenario_2(self, n_tasks, runs=30):
        latencies = []
        failures = 0
        failure_types = {}
        sample_tracebacks = []
        silent_lost_updates = 0
        queue_promotion_anomalies = 0
        total_requests = n_tasks * runs

        # Set max active tasks to N so all N can be active initially
        self.org.advanced_settings = {"max_active_tasks": n_tasks}
        self.org.save()

        start_wall = time.perf_counter()
        for run_idx in range(runs):
            active_tasks = [
                Task.objects.create(
                    title=f"S2_ACT_N{n_tasks}_R{run_idx}_T{i}",
                    status="in_progress",
                    due_date=date.today(),
                    project=self.project,
                    organization=self.org,
                    created_by=self.primary_user,
                    assigned_to=self.primary_user,
                    is_queued=False
                ) for i in range(n_tasks)
            ]

            queued_tasks = [
                Task.objects.create(
                    title=f"S2_QUE_N{n_tasks}_R{run_idx}_Q{q}",
                    status="pending",
                    due_date=date.today() + timedelta(days=q + 1),
                    project=self.project,
                    organization=self.org,
                    created_by=self.primary_user,
                    assigned_to=self.primary_user,
                    is_queued=True
                ) for q in range(min(5, n_tasks))
            ]

            ops = [{
                'user': self.primary_user,
                'task_id': t.id,
                'payload': {'status': 'done'},
                'expected': {'status': 'done'}
            } for t in active_tasks]

            res_list = self._execute_concurrent_batch(ops)

            for r in res_list:
                if r['status_code'] == 200:
                    latencies.append(r['elapsed_ms'])
                else:
                    failures += 1
                    key = r['err_type'] or f"HTTP_{r['status_code']}"
                    failure_types[key] = failure_types.get(key, 0) + 1
                    if len(sample_tracebacks) < 3 and r['err_tb']:
                        sample_tracebacks.append((r['task_id'], r['err_type'], r['err_msg'], r['err_tb']))

            # Verify active tasks
            for t in active_tasks:
                t.refresh_from_db()
                if t.status not in ['done', 'completed']:
                    silent_lost_updates += 1

            # Verify queue promotion
            promoted = 0
            for qt in queued_tasks:
                qt.refresh_from_db()
                if not qt.is_queued and qt.status in ['in_progress', 'done']:
                    promoted += 1

            if failures == 0 and len(queued_tasks) > 0 and promoted == 0:
                queue_promotion_anomalies += 1

            Task.objects.filter(id__in=[t.id for t in active_tasks] + [q.id for q in queued_tasks]).delete()

        wall_time = time.perf_counter() - start_wall
        return {
            "scenario": f"Scenario 2: Complete N={n_tasks} (Queue promotion)",
            "n": n_tasks,
            "runs": runs,
            "total_reqs": total_requests,
            "success_pct": round(((total_requests - failures) / total_requests) * 100, 1),
            "failure_pct": round((failures / total_requests) * 100, 1),
            "failures": failures,
            "failure_types": failure_types if failure_types else "None",
            "avg_lat": round(statistics.mean(latencies), 1) if latencies else 0.0,
            "max_lat": round(max(latencies), 1) if latencies else 0.0,
            "silent_lost_updates": silent_lost_updates,
            "queue_anomalies": queue_promotion_anomalies,
            "wall_time_sec": round(wall_time, 2),
            "sample_tracebacks": sample_tracebacks
        }

    # =========================================================================
    # SCENARIO 3: Mixed fields per task (status, priority, due_date, assigned_to)
    # =========================================================================
    def _run_scenario_3(self, n_tasks, runs=30):
        latencies = []
        failures = 0
        failure_types = {}
        sample_tracebacks = []
        silent_lost_updates = 0
        total_requests = n_tasks * runs

        start_wall = time.perf_counter()
        for run_idx in range(runs):
            tasks = [
                Task.objects.create(
                    title=f"S3_N{n_tasks}_R{run_idx}_T{i}",
                    priority="P3",
                    status="pending",
                    due_date=date.today(),
                    project=self.project,
                    organization=self.org,
                    created_by=self.primary_user,
                    assigned_to=self.primary_user
                ) for i in range(n_tasks)
            ]

            ops = []
            for idx, t in enumerate(tasks):
                mod = idx % 4
                target_user = self.users[idx % len(self.users)]
                if mod == 0:
                    p = {'status': 'in_progress'}
                elif mod == 1:
                    p = {'priority': 'P1'}
                elif mod == 2:
                    p = {'due_date': str(date.today() + timedelta(days=5))}
                else:
                    p = {'assigned_to': target_user.id}
                ops.append({'user': self.primary_user, 'task_id': t.id, 'payload': p})

            res_list = self._execute_concurrent_batch(ops)

            for r in res_list:
                if r['status_code'] == 200:
                    latencies.append(r['elapsed_ms'])
                else:
                    failures += 1
                    key = r['err_type'] or f"HTTP_{r['status_code']}"
                    failure_types[key] = failure_types.get(key, 0) + 1
                    if len(sample_tracebacks) < 3 and r['err_tb']:
                        sample_tracebacks.append((r['task_id'], r['err_type'], r['err_msg'], r['err_tb']))

            for idx, t in enumerate(tasks):
                t.refresh_from_db()
                mod = idx % 4
                target_user = self.users[idx % len(self.users)]
                if mod == 0 and t.status != 'in_progress':
                    silent_lost_updates += 1
                elif mod == 1 and t.priority != 'P1':
                    silent_lost_updates += 1
                elif mod == 2 and t.due_date != (date.today() + timedelta(days=5)):
                    silent_lost_updates += 1
                elif mod == 3 and t.assigned_to_id != target_user.id:
                    silent_lost_updates += 1

            Task.objects.filter(id__in=[t.id for t in tasks]).delete()

        wall_time = time.perf_counter() - start_wall
        return {
            "scenario": f"Scenario 3: Mixed fields N={n_tasks}",
            "n": n_tasks,
            "runs": runs,
            "total_reqs": total_requests,
            "success_pct": round(((total_requests - failures) / total_requests) * 100, 1),
            "failure_pct": round((failures / total_requests) * 100, 1),
            "failures": failures,
            "failure_types": failure_types if failure_types else "None",
            "avg_lat": round(statistics.mean(latencies), 1) if latencies else 0.0,
            "max_lat": round(max(latencies), 1) if latencies else 0.0,
            "silent_lost_updates": silent_lost_updates,
            "wall_time_sec": round(wall_time, 2),
            "sample_tracebacks": sample_tracebacks
        }

    # =========================================================================
    # SCENARIO 4: Same task, 10 simultaneous requests (lost-update check)
    # =========================================================================
    def _run_scenario_4(self, runs=30):
        latencies = []
        failures = 0
        failure_types = {}
        sample_tracebacks = []
        silent_lost_updates = 0
        total_requests = 10 * runs

        start_wall = time.perf_counter()
        for run_idx in range(runs):
            task = Task.objects.create(
                title=f"S4_SHARED_R{run_idx}",
                priority="P3",
                status="pending",
                due_date=date.today(),
                project=self.project,
                organization=self.org,
                created_by=self.primary_user,
                assigned_to=self.primary_user
            )

            # 10 simultaneous requests targeting the SAME task
            ops = [{
                'user': self.primary_user,
                'task_id': task.id,
                'payload': {'description': f"Write from worker {i} on run {run_idx}", 'priority': f"P{min(i % 4 + 1, 4)}"}
            } for i in range(10)]

            res_list = self._execute_concurrent_batch(ops)

            success_ops = 0
            for r in res_list:
                if r['status_code'] == 200:
                    latencies.append(r['elapsed_ms'])
                    success_ops += 1
                else:
                    failures += 1
                    key = r['err_type'] or f"HTTP_{r['status_code']}"
                    failure_types[key] = failure_types.get(key, 0) + 1
                    if len(sample_tracebacks) < 3 and r['err_tb']:
                        sample_tracebacks.append((r['task_id'], r['err_type'], r['err_msg'], r['err_tb']))

            task.refresh_from_db()
            # If multiple returned 200, only the last writer survived (classic last-write-wins)
            if success_ops > 1:
                # Documented last-write-wins overwrote earlier successful writes
                silent_lost_updates += (success_ops - 1)

            task.delete()

        wall_time = time.perf_counter() - start_wall
        return {
            "scenario": "Scenario 4: Same task, 10 competing writers",
            "n": 10,
            "runs": runs,
            "total_reqs": total_requests,
            "success_pct": round(((total_requests - failures) / total_requests) * 100, 1),
            "failure_pct": round((failures / total_requests) * 100, 1),
            "failures": failures,
            "failure_types": failure_types if failure_types else "None",
            "avg_lat": round(statistics.mean(latencies), 1) if latencies else 0.0,
            "max_lat": round(max(latencies), 1) if latencies else 0.0,
            "silent_lost_updates": silent_lost_updates,
            "wall_time_sec": round(wall_time, 2),
            "sample_tracebacks": sample_tracebacks
        }

    # =========================================================================
    # SCENARIO 5: 5 users each updating their own tasks simultaneously
    # =========================================================================
    def _run_scenario_5(self, runs=30):
        latencies = []
        failures = 0
        failure_types = {}
        sample_tracebacks = []
        silent_lost_updates = 0
        total_requests = len(self.users) * runs

        start_wall = time.perf_counter()
        for run_idx in range(runs):
            tasks = [
                Task.objects.create(
                    title=f"S5_USER_{u.id}_R{run_idx}",
                    priority="P3",
                    status="in_progress",
                    due_date=date.today(),
                    project=self.project,
                    organization=self.org,
                    created_by=u,
                    assigned_to=u
                ) for u in self.users
            ]

            ops = [{
                'user': u,
                'task_id': t.id,
                'payload': {'title': f"S5_DONE_{u.id}", 'status': 'done'}
            } for u, t in zip(self.users, tasks)]

            res_list = self._execute_concurrent_batch(ops)

            for r in res_list:
                if r['status_code'] == 200:
                    latencies.append(r['elapsed_ms'])
                else:
                    failures += 1
                    key = r['err_type'] or f"HTTP_{r['status_code']}"
                    failure_types[key] = failure_types.get(key, 0) + 1
                    if len(sample_tracebacks) < 3 and r['err_tb']:
                        sample_tracebacks.append((r['task_id'], r['err_type'], r['err_msg'], r['err_tb']))

            for t in tasks:
                t.refresh_from_db()
                if t.status not in ['done', 'completed']:
                    silent_lost_updates += 1

            Task.objects.filter(id__in=[t.id for t in tasks]).delete()

        wall_time = time.perf_counter() - start_wall
        return {
            "scenario": "Scenario 5: 5 distinct users updating own tasks",
            "n": len(self.users),
            "runs": runs,
            "total_reqs": total_requests,
            "success_pct": round(((total_requests - failures) / total_requests) * 100, 1),
            "failure_pct": round((failures / total_requests) * 100, 1),
            "failures": failures,
            "failure_types": failure_types if failure_types else "None",
            "avg_lat": round(statistics.mean(latencies), 1) if latencies else 0.0,
            "max_lat": round(max(latencies), 1) if latencies else 0.0,
            "silent_lost_updates": silent_lost_updates,
            "wall_time_sec": round(wall_time, 2),
            "sample_tracebacks": sample_tracebacks
        }

    # =========================================================================
    # MASTER RUNNER
    # =========================================================================
    def test_run_full_benchmark_suite(self):
        """
        Runs all 5 scenarios with 30 runs each.
        Generates markdown tables and diagnostic reports.
        """
        all_results = []
        traceback_archive = []

        print("\n" + "=" * 90)
        print("STARTING FULL SQLITE CONCURRENCY BENCHMARK SUITE (30 RUNS PER SCENARIO)")
        print("=" * 90)

        # Scenarios 1, 2, 3 across N = 5, 20, 50, 100
        for n in [5, 20, 50, 100]:
            print(f"\n[Running] Scenario 1 (N={n}, 30 runs)...")
            r1 = self._run_scenario_1(n_tasks=n, runs=30)
            all_results.append(r1)
            traceback_archive.extend(r1.get('sample_tracebacks', []))
            print(f" -> Result: Success={r1['success_pct']}%, Failures={r1['failures']}, Avg Latency={r1['avg_lat']}ms")

            print(f"\n[Running] Scenario 2 (Queue Promotion N={n}, 30 runs)...")
            r2 = self._run_scenario_2(n_tasks=n, runs=30)
            all_results.append(r2)
            traceback_archive.extend(r2.get('sample_tracebacks', []))
            print(f" -> Result: Success={r2['success_pct']}%, Failures={r2['failures']}, Avg Latency={r2['avg_lat']}ms")

            print(f"\n[Running] Scenario 3 (Mixed Fields N={n}, 30 runs)...")
            r3 = self._run_scenario_3(n_tasks=n, runs=30)
            all_results.append(r3)
            traceback_archive.extend(r3.get('sample_tracebacks', []))
            print(f" -> Result: Success={r3['success_pct']}%, Failures={r3['failures']}, Avg Latency={r3['avg_lat']}ms")

        # Scenario 4 (Same task, 10 competing writers, 30 runs)
        print("\n[Running] Scenario 4 (Same task, 10 competing writers, 30 runs)...")
        r4 = self._run_scenario_4(runs=30)
        all_results.append(r4)
        traceback_archive.extend(r4.get('sample_tracebacks', []))
        print(f" -> Result: Success={r4['success_pct']}%, Failures={r4['failures']}, Overwritten={r4['silent_lost_updates']}")

        # Scenario 5 (5 distinct users updating own tasks, 30 runs)
        print("\n[Running] Scenario 5 (5 distinct users updating own tasks, 30 runs)...")
        r5 = self._run_scenario_5(runs=30)
        all_results.append(r5)
        traceback_archive.extend(r5.get('sample_tracebacks', []))
        print(f" -> Result: Success={r5['success_pct']}%, Failures={r5['failures']}, Avg Latency={r5['avg_lat']}ms")

        # =====================================================================
        # REPORT OUTPUT
        # =====================================================================
        print("\n" + "#" * 105)
        print("CONCURRENT UPDATE BENCHMARK RESULTS (SQLITE FILE-BASED DATABASE)")
        print("#" * 105)
        header = f"| {'Scenario':<42} | {'N':<4} | {'Total':<6} | {'Success%':<9} | {'Fail%':<7} | {'Avg(ms)':<8} | {'Max(ms)':<8} | {'Lost/Overwritten':<17} | {'Failures Breakdown':<20} |"
        print(header)
        print("|" + "-" * 44 + "|" + "-" * 6 + "|" + "-" * 8 + "|" + "-" * 11 + "|" + "-" * 9 + "|" + "-" * 10 + "|" + "-" * 10 + "|" + "-" * 19 + "|" + "-" * 22 + "|")
        for res in all_results:
            row = (
                f"| {res['scenario']:<42} "
                f"| {res['n']:<4} "
                f"| {res['total_reqs']:<6} "
                f"| {res['success_pct']:<8.1f}% "
                f"| {res['failure_pct']:<6.1f}% "
                f"| {res['avg_lat']:<8} "
                f"| {res['max_lat']:<8} "
                f"| {res['silent_lost_updates']:<17} "
                f"| {str(res['failure_types']):<20} |"
            )
            print(row)
        print("#" * 105)

        if traceback_archive:
            print("\n--- FAILING REQUEST TRACEBACK SAMPLES (FIRST 3) ---")
            for idx, (t_id, err_t, err_m, tb) in enumerate(traceback_archive[:3], 1):
                print(f"\n[Sample {idx}] Task ID: {t_id} | Type: {err_t} | Message: {err_m}")
                print(tb)
        else:
            print("\nNo unhandled exceptions or 500 tracebacks observed across all runs.")
