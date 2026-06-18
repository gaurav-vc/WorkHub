import requests

BASE_URL = "http://localhost:8080"
USERNAME = "Admin"
PASSWORD = "Tech@123"
LOGIN_ENDPOINT = "/api/auth/login/"
DASHBOARD_ENDPOINT = "/api/myday/dashboard/"

def test_get_api_myday_dashboard_with_valid_jwt_token():
    try:
        # Authenticate to get JWT token
        login_url = BASE_URL + LOGIN_ENDPOINT
        login_payload = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_response = requests.post(login_url, json=login_payload, timeout=30)
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_data = login_response.json()
        assert "access" in login_data and isinstance(login_data["access"], str), "Access token missing or invalid in login response"

        access_token = login_data["access"]

        # Get dashboard data with valid JWT token
        dashboard_url = BASE_URL + DASHBOARD_ENDPOINT
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        dashboard_response = requests.get(dashboard_url, headers=headers, timeout=30)
        assert dashboard_response.status_code == 200, f"Dashboard API returned status {dashboard_response.status_code}"
        dashboard_data = dashboard_response.json()

        # Validate response data structure
        assert isinstance(dashboard_data, dict), "Dashboard response is not a JSON object"
        assert "currentUser" in dashboard_data and isinstance(dashboard_data["currentUser"], dict), "'currentUser' missing or not an object"
        assert "summaryStats" in dashboard_data and isinstance(dashboard_data["summaryStats"], dict), "'summaryStats' missing or not an object"
        assert "pendingApprovals" in dashboard_data and isinstance(dashboard_data["pendingApprovals"], list), "'pendingApprovals' missing or not an array"

    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"

test_get_api_myday_dashboard_with_valid_jwt_token()
