import requests

BASE_URL = "http://localhost:8080"
AUTH_LOGIN_PATH = "/api/auth/login/"
MYDAY_DASHBOARD_PATH = "/api/myday/dashboard/"
APPROVAL_ACTION_PATH_TEMPLATE = "/api/myday/approvals/{approval_id}/action/"

USERNAME = "Admin"
PASSWORD = "Tech@123"
TIMEOUT = 30

def test_post_api_myday_approvals_approval_id_action_approve_by_owner():
    # Authenticate and get JWT token
    login_payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(
            f"{BASE_URL}{AUTH_LOGIN_PATH}",
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        tokens = login_resp.json()
        access_token = tokens.get("access")
        assert access_token and isinstance(access_token, str), "Access token missing or invalid"

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Get dashboard to find an approval assigned to the user
        dashboard_resp = requests.get(
            f"{BASE_URL}{MYDAY_DASHBOARD_PATH}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert dashboard_resp.status_code == 200, f"Dashboard fetch failed: {dashboard_resp.text}"
        dashboard_data = dashboard_resp.json()
        pending_approvals = dashboard_data.get("pendingApprovals", [])
        assert isinstance(pending_approvals, list), "pendingApprovals is not a list"
        assert len(pending_approvals) > 0, "No pending approvals found for the user"

        approval_id = None
        # Pick first approval assumed assigned to user (since it's the user's dashboard)
        for approval in pending_approvals:
            # Approval should be an object with an "id" field (common pattern)
            if isinstance(approval, dict) and "id" in approval:
                approval_id = approval["id"]
                break
        assert approval_id is not None, "No approval ID found in pending approvals"

        # Perform the approve action on the approval
        action_payload = {
            "action": "approve"
        }
        approval_action_url = f"{BASE_URL}{APPROVAL_ACTION_PATH_TEMPLATE.format(approval_id=approval_id)}"
        approval_resp = requests.post(
            approval_action_url,
            headers=headers,
            json=action_payload,
            timeout=TIMEOUT
        )
        assert approval_resp.status_code == 200, f"Approval action failed: {approval_resp.text}"
        approval_result = approval_resp.json()

        # Validate response contains "message" and "status" keys with string values
        assert "message" in approval_result and isinstance(approval_result["message"], str), "Response missing valid 'message'"
        assert "status" in approval_result and isinstance(approval_result["status"], str), "Response missing valid 'status'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_myday_approvals_approval_id_action_approve_by_owner()
