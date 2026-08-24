import os
import requests
from dotenv import load_dotenv

load_dotenv()

client_id = os.environ.get('GOOGLE_CLIENT_ID')
client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
refresh_token = os.environ.get('GOOGLE_ADMIN_REFRESH_TOKEN')

print(f"Client ID: {client_id}")
print(f"Secret length: {len(client_secret) if client_secret else 0}")
print(f"Token length: {len(refresh_token) if refresh_token else 0}")

res = requests.post(
    'https://oauth2.googleapis.com/token',
    data={
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
    }
)

print(f"Status Code: {res.status_code}")
print(f"Response: {res.text}")
