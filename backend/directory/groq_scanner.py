import os
import json
import base64
import requests
from django.conf import settings

class GroqBusinessCardScanner:
    def __init__(self):
        self.api_key = os.environ.get('GROQ_API_KEY')
        if not self.api_key and hasattr(settings, 'GROQ_API_KEY'):
            self.api_key = settings.GROQ_API_KEY
            
        if not self.api_key:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
            self.api_key = os.environ.get('GROQ_API_KEY')

        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set.")
            
    def scan(self, image_stream):
        try:
            # Read image and convert to base64
            image_data = image_stream.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "llama-3.2-11b-vision-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "You are a business card scanner. Extract the exact following fields from this business card. Return ONLY a raw JSON object with the keys: 'name', 'email', 'phone', 'company', 'job_title'. If a field is not found, leave it as an empty string. DO NOT wrap the output in markdown block like ```json."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 1024,
            }
            
            response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            
            result_json = response.json()
            text_response = result_json["choices"][0]["message"]["content"].strip()
            
            # Clean up markdown if the model still returns it
            if text_response.startswith('```json'):
                text_response = text_response[7:]
            if text_response.startswith('```'):
                text_response = text_response[3:]
            if text_response.endswith('```'):
                text_response = text_response[:-3]
            text_response = text_response.strip()
                
            data = json.loads(text_response)
            
            return {
                'name': data.get('name', ''),
                'email': data.get('email', ''),
                'phone': data.get('phone', ''),
                'company': data.get('company', ''),
                'job_title': data.get('job_title', ''),
                'raw_text': "Scanned natively using Groq Llama 3.2 Vision"
            }
        except Exception as e:
            raise Exception(f"Groq API Scanning failed: {str(e)}")
