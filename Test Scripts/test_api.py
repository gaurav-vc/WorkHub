import requests
import json

base_url = "http://127.0.0.1:8000/api"

# 1. Login to get token
login_data = {
    "username": "dummy_active",
    "password": "password"
}
res = requests.post(f"{base_url}/auth/login/", json=login_data)
if res.status_code == 200:
    token = res.json().get('access')
    print("GOT TOKEN:", token[:10], "...")
    
    # 2. Fetch pending users
    headers = {"Authorization": f"Bearer {token}"}
    users_res = requests.get(f"{base_url}/auth/pending-users/", headers=headers)
    print("PENDING USERS STATUS:", users_res.status_code)
    print("PENDING USERS DATA:", users_res.text)

    # 3. Fetch access requests
    reqs_res = requests.get(f"{base_url}/rbac/access-requests/", headers=headers)
    print("ACCESS REQUESTS STATUS:", reqs_res.status_code)
    print("ACCESS REQUESTS DATA:", reqs_res.text)
else:
    print("LOGIN FAILED:", res.status_code, res.text)
