import requests

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
TASK_CREATE_URL = f"{BASE_URL}/api/myday/tasks/create/"

USERNAME = "Admin"
PASSWORD = "Tech@123"


def test_postapimydaytaskscreatewithvalidjwttoken():
    try:
        # Authenticate user to get JWT access token
        login_payload = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=30)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_data = login_response.json()

        access_token = login_data.get("access")
        assert isinstance(access_token, str) and access_token, "Access token not found in login response"

        # Create a new task with valid JWT token
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        task_payload = {
            "title": "Test Task Title",
            "priority": "High"
        }
        create_response = requests.post(TASK_CREATE_URL, json=task_payload, headers=headers, timeout=30)
        assert create_response.status_code == 200, f"Task creation failed with status {create_response.status_code}"

        create_data = create_response.json()
        assert "message" in create_data and isinstance(create_data["message"], str) and create_data["message"], "Success message missing or invalid"
        assert "task_id" in create_data and isinstance(create_data["task_id"], int), "Valid task_id missing in response"
    except requests.RequestException as e:
        assert False, f"RequestException during test: {e}"


test_postapimydaytaskscreatewithvalidjwttoken()