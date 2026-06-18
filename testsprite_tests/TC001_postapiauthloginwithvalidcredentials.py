import requests
from requests.auth import HTTPBasicAuth

def test_postapiauthloginwithvalidcredentials():
    base_url = "http://localhost:8080"
    endpoint = "/api/auth/login/"
    url = base_url + endpoint
    username = "Admin"
    password = "Tech@123"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_response = response.json()
        assert "access" in json_response and isinstance(json_response["access"], str) and json_response["access"], "Missing or invalid 'access' token"
        assert "refresh" in json_response and isinstance(json_response["refresh"], str) and json_response["refresh"], "Missing or invalid 'refresh' token"
        assert "id" in json_response and isinstance(json_response["id"], int), "Missing or invalid 'id' token"
    except requests.RequestException as ex:
        assert False, f"Request failed: {ex}"

test_postapiauthloginwithvalidcredentials()
