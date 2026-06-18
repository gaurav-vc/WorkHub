import urllib.request
import urllib.parse
import json

url = "http://localhost:8000/api/learning_center/question_bank/delete_empty/"
req = urllib.request.Request(url, method="POST", headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
