import os
import json
import requests
from django.conf import settings
from PIL import Image
import pytesseract

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
            
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        else:
            pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
            
    def scan(self, image_stream):
        try:
            # 1. Use Local Tesseract to grab raw text (Fast and local, avoids Vision API limits)
            image = Image.open(image_stream)
            image = image.convert('L')
            
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            raw_text = pytesseract.image_to_string(image, config='--psm 11')
            
            if not raw_text.strip():
                raise ValueError("Could not detect any text on the card. Please try a clearer image.")
                
            # 2. Feed raw text to Groq's Text Model for intelligent parsing (Instant JSON extraction)
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Auto-detect a valid model to prevent "decommissioned" or "not found" errors
            models_response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
            if models_response.status_code == 200:
                available_models = [m["id"] for m in models_response.json().get("data", [])]
                # Filter out classification/embedding models
                chat_models = [m for m in available_models if "llama" in m.lower() or "mixtral" in m.lower() or "gemma" in m.lower()]
                
                priority_models = ["llama-3.1-8b-instant", "mixtral-8x7b-32768", "llama3-8b-8192", "gemma2-9b-it"]
                best_model = next((m for m in priority_models if m in chat_models), None)
                
                if not best_model and chat_models:
                    best_model = chat_models[0]
            else:
                best_model = "llama-3.1-8b-instant"
                
            if not best_model:
                best_model = "llama-3.1-8b-instant"
            
            payload = {
                "model": best_model,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Extract details from this business card into a strict JSON object with EXACT keys: 'name', 'email', 'phone', 'company', 'job_title'. If a field is missing, use an empty string. Output ONLY the JSON.\n\nTEXT:\n{raw_text}"
                    }
                ],
                "temperature": 0.1
            }
            
            response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Groq Error {response.status_code}: {response.text}")
                
            response.raise_for_status()
            
            result_json = response.json()
            text_response = result_json["choices"][0]["message"]["content"].strip()
            
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
                'raw_text': raw_text
            }
        except Exception as e:
            raise Exception(f"Scanning failed: {str(e)}")
