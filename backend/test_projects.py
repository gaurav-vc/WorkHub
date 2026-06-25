import urllib.request
import json

url = "http://127.0.0.1:8000/api/projects/"

# Get a token for user 1
try:
    # Wait, simple JWT token? I can't generate it easily here, let's just make an unauthenticated request.
    req = urllib.request.Request(url, method='GET')
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", str(e))
