import requests

BASE_URL = "http://localhost:8080"
AUTH_URL = f"{BASE_URL}/api/auth/login/"
TASK_CREATE_URL = f"{BASE_URL}/api/myday/tasks/create/"
TASK_TOGGLE_URL_TEMPLATE = f"{BASE_URL}/api/myday/tasks/{{task_id}}/toggle/"

USERNAME = "admin"
PASSWORD = "Tech@123"
TIMEOUT = 30


def test_postapimydaytaskstaskidtogglewithvalidjwttoken():
    # Authenticate and get JWT access token
    auth_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        auth_response = requests.post(AUTH_URL, json=auth_payload, timeout=TIMEOUT)
        assert auth_response.status_code == 200, f"Authentication failed: {auth_response.text}"
        auth_json = auth_response.json()
        access_token = auth_json.get("access")
        assert access_token, "No access token in authentication response"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Authentication step failed: {e}")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Create a new task to toggle
    created_task_id = None
    create_payload = {
        "title": "Test task for toggle",
        "priority": "Medium"
    }
    try:
        create_response = requests.post(TASK_CREATE_URL, json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_response.status_code == 200, f"Task creation failed: {create_response.text}"
        create_json = create_response.json()
        created_task_id = create_json.get("task_id")
        assert isinstance(created_task_id, int), "Invalid task_id returned from create task"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Task creation step failed: {e}")

    # Toggle the created task's status and verify response
    toggle_url = TASK_TOGGLE_URL_TEMPLATE.format(task_id=created_task_id)
    try:
        toggle_response = requests.post(toggle_url, headers=headers, timeout=TIMEOUT)
        assert toggle_response.status_code == 200, f"Task toggle failed: {toggle_response.text}"
        toggle_json = toggle_response.json()
        message = toggle_json.get("message")
        status = toggle_json.get("status")
        assert isinstance(message, str) and message, "Missing or invalid message in toggle response"
        assert isinstance(status, str) and status, "Missing or invalid status in toggle response"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Task toggle step failed: {e}")
    finally:
        # Cleanup: delete the created task if API allowed deletion (not specified, so skip)
        # If deletion endpoint existed, we would delete here.
        pass


test_postapimydaytaskstaskidtogglewithvalidjwttoken()
