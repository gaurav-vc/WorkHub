import os
import re
import cv2
import json
import requests
import numpy as np
from django.conf import settings

class PyTorchBusinessCardScanner:
    def __init__(self):
        try:
            import easyocr
            # Initialize the EasyOCR reader (Local, Free)
            self.reader = easyocr.Reader(['en'], gpu=False)
        except ImportError:
            raise ImportError("Please install PyTorch and EasyOCR: pip install torch torchvision easyocr")
            
        # Initialize Groq API Key (100% Free API)
        self.api_key = os.environ.get('GROQ_API_KEY')
        if not self.api_key and hasattr(settings, 'GROQ_API_KEY'):
            self.api_key = settings.GROQ_API_KEY
            
        if not self.api_key:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
            self.api_key = os.environ.get('GROQ_API_KEY')

        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set. Please add it to your .env file.")

    def process_image(self, image_stream):
        # Read image from stream for OpenCV
        file_bytes = np.asarray(bytearray(image_stream.read()), dtype=np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        return image

    def extract_info_via_groq(self, raw_text):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 1. Auto-detect a valid Chat model to prevent "decommissioned" or "not found" errors
        best_model = "llama-3.1-8b-instant" # Default fallback
        try:
            models_response = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=5)
            if models_response.status_code == 200:
                available_models = [m["id"] for m in models_response.json().get("data", [])]
                # Filter out classification/audio models. Only keep text chat models.
                chat_models = [m for m in available_models if "llama" in m.lower() or "mixtral" in m.lower() or "gemma" in m.lower()]
                
                priority_models = ["llama-3.1-8b-instant", "mixtral-8x7b-32768", "llama3-8b-8192", "gemma2-9b-it"]
                best_model = next((m for m in priority_models if m in chat_models), None)
                
                if not best_model and chat_models:
                    best_model = chat_models[0]
        except Exception:
            pass # Ignore errors in model fetching and use the fallback
            
        # 2. Ask Groq to organize the raw messy text into perfect JSON
        # We merge system and user prompts into a single user message to ensure 100% compatibility across all Groq models.
        payload = {
            "model": best_model,
            "messages": [
                {
                    "role": "user",
                    "content": f"You are a business card parser. Extract details from this business card OCR text into a strict JSON object with EXACT keys: 'name', 'email', 'phone', 'company', 'job_title'. If a field is missing, use an empty string. Output ONLY the raw JSON object and nothing else.\n\nOCR TEXT:\n{raw_text}"
                }
            ],
            "temperature": 0.1
        }
        
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15)
        
        if response.status_code != 200:
            raise Exception(f"Groq API Error {response.status_code}: {response.text}")
            
        response.raise_for_status()
        
        result_json = response.json()
        text_response = result_json["choices"][0]["message"]["content"].strip()
        
        # Clean up markdown code blocks if the AI wraps it in ```json ... ```
        if text_response.startswith('```json'):
            text_response = text_response[7:]
        if text_response.startswith('```'):
            text_response = text_response[3:]
        if text_response.endswith('```'):
            text_response = text_response[:-3]
        text_response = text_response.strip()
            
        try:
            data = json.loads(text_response)
            if not isinstance(data, dict):
                data = {}
        except Exception:
            data = {}
            
        return {
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'company': data.get('company', ''),
            'job_title': data.get('job_title', ''),
            'raw_text': raw_text
        }

    def scan(self, image_stream):
        image = self.process_image(image_stream)
        
        # 1. EasyOCR (PyTorch) extracts the raw text LOCALLY and for FREE
        result = self.reader.readtext(image)
        
        # Sort by Y-coordinate to read top-to-bottom
        result.sort(key=lambda x: x[0][0][1])
        
        extracted_text = []
        for (bbox, text, prob) in result:
            if text.strip(): # Accept all text regardless of confidence to prevent missing hard-to-read fonts
                extracted_text.append(text)
                
        all_text = "\n".join(extracted_text)
        
        if not all_text.strip():
            raise ValueError("The image is too blurry or far away. Please hold the card closer and take a clearer photo!")
            
        # 2. Groq's super-fast Text AI organizes the messy text into perfect fields for FREE
        return self.extract_info_via_groq(all_text)
