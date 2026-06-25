import urllib.request
import json

url = "http://127.0.0.1:8000/api/projects/"
data = json.dumps({
    "name": "Test Project",
    "description": "Test",
    "department": "Engineering"
}).encode('utf-8')

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", str(e))
