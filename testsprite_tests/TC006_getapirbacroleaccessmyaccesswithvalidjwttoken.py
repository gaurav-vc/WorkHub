import requests

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
MY_ACCESS_URL = f"{BASE_URL}/api/rbac/role-access/my_access/"

USERNAME = "Admin"
PASSWORD = "Tech@123"
TIMEOUT = 30

def test_get_api_rbac_role_access_my_access_with_valid_jwt_token():
    try:
        # Authenticate to get JWT access token
        login_payload = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_headers = {
            "Content-Type": "application/json"
        }
        login_resp = requests.post(LOGIN_URL, json=login_payload, headers=login_headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
        login_data = login_resp.json()
        assert "access" in login_data, "Access token missing in login response"
        access_token = login_data["access"]

        # Use the access token to access the RBAC my_access endpoint
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        resp = requests.get(MY_ACCESS_URL, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected status 200 but got {resp.status_code}"
        resp_json = resp.json()
        # Validate that 'role' is a string and 'access' is a list
        assert "role" in resp_json, "'role' field missing in response"
        assert isinstance(resp_json["role"], str), "'role' field is not a string"
        assert "access" in resp_json, "'access' field missing in response"
        assert isinstance(resp_json["access"], list), "'access' field is not a list"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_get_api_rbac_role_access_my_access_with_valid_jwt_token()