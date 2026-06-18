import requests

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
ORG_CREATE_URL = f"{BASE_URL}/api/organization/organizations/"
USERNAME = "admin"
PASSWORD = "Tech@123"
TIMEOUT = 30

def test_post_api_organization_organizations_with_valid_jwt_token():
    # Authenticate and get JWT token
    try:
        auth_response = requests.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert auth_response.status_code == 200, f"Authentication failed: {auth_response.text}"
        auth_data = auth_response.json()
        access_token = auth_data.get("access")
        assert isinstance(access_token, str) and len(access_token) > 0, "Access token missing or invalid"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Authentication step failed: {e}")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Define organization data (required admin details)
    org_payload = {
        "name": "Test Organization TC007",
        "admin_email": "admin.tc007@example.com",
        "admin_name": "Admin TC007"
    }

    org_id = None
    try:
        # Create new organization
        create_response = requests.post(
            ORG_CREATE_URL,
            json=org_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert create_response.status_code == 201, f"Unexpected status code: {create_response.status_code}, body: {create_response.text}"
        create_data = create_response.json()
        org_id = create_data.get("id")
        org_name = create_data.get("name")

        assert isinstance(org_id, int), "Organization id missing or invalid"
        assert org_name == org_payload["name"], f"Organization name mismatch: expected {org_payload['name']}, got {org_name}"

    finally:
        # Cleanup: delete the created organization if it was created
        if org_id:
            try:
                delete_url = f"{ORG_CREATE_URL}{org_id}/"
                delete_response = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Deleting might return 204 No Content or 200 OK depending on API design
                assert delete_response.status_code in (200, 204), f"Failed to delete organization id {org_id}, status: {delete_response.status_code}"
            except (requests.RequestException, AssertionError) as e:
                # Cleanup failure should not raise, but log or print if needed
                print(f"Warning: cleanup delete failed for organization id {org_id}: {e}")

test_post_api_organization_organizations_with_valid_jwt_token()
