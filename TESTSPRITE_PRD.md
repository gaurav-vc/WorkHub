# Product Risk Document (PRD): 80/20 Critical Business Flow Test Execution

**Role:** Principal QA Architect, Security Auditor & Production Risk Analyst  
**Objective:** Validate minimum workflows representing 80% of business value and production risk.  
**Scope:** System Access, Organization Setup, User Onboarding, RBAC, Tenant Isolation, Request Lifecycle, Workflows, Security Smoke Test.  

> [!IMPORTANT]
> The following issues represent critical blockers to production readiness. The platform currently fails multiple P0 flows related to authorization, tenant isolation, and IDOR vulnerabilities. 

---

## Executive Summary
While the core business flows (Login, Org Setup, Tasks) function on the happy path, the platform currently suffers from **critical authorization and isolation flaws**. The frontend is bearing the entirety of the RBAC responsibility, while the backend APIs remain exposed. Cross-tenant data leakage and privilege escalation attacks are currently possible. 

The platform is **NOT** production-ready until the findings below are remediated.

---

## Critical Findings (P0 / High Risk)

### 1. Insecure Direct Object Reference (IDOR) in Approval Workflows
* **Severity:** Critical (P0)
* **Business Impact:** Any authenticated user can approve or decline any HR/Business request in the system, completely bypassing managerial approval chains. This allows employees to approve their own requests or disrupt others.
* **Reproduction Steps:**
  1. Log in as a standard employee.
  2. Send a `POST` request to `/api/myday/approvals/{approval_id}/action/` with `{"action": "approve"}` for an ID belonging to someone else.
* **Root Cause:** In `myday/views.py`, the `handle_approval` function fetches the `Approval` object by ID but fails to verify if `request.user == approval.approver`.
* **Recommended Fix:** Add an explicit authorization check: `if approval.approver != request.user: return Response(status=403)`.

### 2. Missing Backend RBAC Enforcement (Privilege Escalation)
* **Severity:** Critical (P0)
* **Business Impact:** RBAC is only enforced via UI routing (frontend `hasAccess` function). Malicious users can bypass the frontend and interact with restricted modules directly via API, resulting in complete privilege escalation.
* **Reproduction Steps:**
  1. Log in as a user restricted from the "Directory" or "Tasks" module.
  2. Perform a direct API call (e.g., `POST /api/myday/create_task/` or `PATCH /api/rbac/role-access/{id}/`).
  3. The request will succeed despite UI restrictions.
* **Root Cause:** Backend API views and viewsets only enforce `@permission_classes([IsAuthenticated])`. They do not check the `RoleAccessMapping` table to verify if the user's role has `edit`, `create`, or `view` permissions.
* **Recommended Fix:** Implement a custom DRF Permission class (e.g., `HasRBACPermission`) that intercepts requests and validates `request.user.role` against `RoleAccessMapping` before allowing the request to proceed.

### 3. Missing Edit/Create UI Restrictions (Frontend RBAC Incompleteness)
* **Severity:** High (P1)
* **Business Impact:** Users whose view permissions are enabled but edit/create permissions are disabled can still see and interact with mutation UI elements (buttons, forms), leading to a confusing UX and relying entirely on backend failures (which currently don't exist, see Finding 2).
* **Reproduction Steps:**
  1. Assign an employee to a module with `view: True`, `edit: False`, `create: False`.
  2. The employee can still see the "Create" buttons and forms within that module.
* **Root Cause:** The `AppSidebar.tsx` and `ProtectedRoute.tsx` only evaluate `permissions.view`. There are no wrapper components (e.g., `<RequirePermission type="edit">`) to conditionally render action elements.
* **Recommended Fix:** Create a `usePermission` hook and wrap all mutation UI components in permission checks that evaluate `accessObj.permissions.edit` and `accessObj.permissions.create`.

### 4. Tenant Data Leakage via Standard ViewSets
* **Severity:** Critical (P0)
* **Business Impact:** Organizations can potentially read or modify data belonging to other organizations if certain API endpoints are discovered or manipulated, violating strict enterprise compliance rules.
* **Reproduction Steps:**
  1. Log in as a user in Organization A.
  2. Query standard DRF endpoints (e.g., `UserViewSet` or feature endpoints) that do not inherit from `TenantModelViewSet`.
* **Root Cause:** While a `TenantMiddleware` exists, it is not consistently enforced across all database queries. Standard DRF `ModelViewSets` default to `Model.objects.all()` unless `get_queryset()` is explicitly overridden or they inherit from the custom `TenantModelViewSet`.
* **Recommended Fix:** Perform a global audit of all DRF `ViewSets`. Ensure every tenant-bound model inherits from `TenantModel` and every view inherits from `TenantModelViewSet` to automatically inject the `site_id` filter into all queries.

### 5. Fragmented Role Definitions Leading to Fail-Open Risks
* **Severity:** High (P1)
* **Business Impact:** New employees assigned to custom string-based roles (e.g., "QA") during creation may bypass expected modular restrictions if those roles were never synced to the RBAC engine.
* **Reproduction Steps:**
  1. Create a user and type a custom role name not in the `Role` table.
  2. The user inherits the generic "user" fallback permissions instead of failing closed or being prompted for mapping.
* **Root Cause:** The `UserViewSet` creates roles based on arbitrary string inputs for `EmployeeProfile.role` rather than linking to a strict Foreign Key relationship with `role_base_access.Role`.
* **Recommended Fix:** Refactor user creation to select roles from the `role_base_access.Role` table via Foreign Key, ensuring all assigned roles exist in the RBAC mapping table.

---

## Conclusion
If the above 5 findings are remediated, the platform will successfully pass the 80/20 critical business flow threshold. The primary focus for the next sprint **must** be shifting RBAC and Tenant Isolation from "UI-only" implementations to strict Backend API enforcements.
