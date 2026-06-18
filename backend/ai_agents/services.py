import os
import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from django.core.cache import cache
from django.conf import settings
from .models import AIMessage, AIUsageLog
from MyDay.views import get_ai_context_data

class AIGatewayService:
    def __init__(self):
        self.api_key = getattr(settings, 'GEMINI_API_KEY', os.environ.get('VITE_GEMINI_API_KEY', 'AQ.Ab8RN6JD3f3nMH_Bx_y3JXdMsK3JOi4B9rZeHA5EvGvaXAFLZw'))
        genai.configure(api_key=self.api_key)
        self.models_to_try = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash"]

    def try_generate_content(self, prompt):
        last_err = None
        for model_name in self.models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                return model.generate_content(prompt)
            except Exception as e:
                last_err = e
                if "404" in str(e) or "429" in str(e) or "503" in str(e):
                    continue
                raise e
        raise last_err

    def try_start_chat(self, history, prompt):
        last_err = None
        for model_name in self.models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                chat = model.start_chat(history=history)
                return chat.send_message(prompt)
            except Exception as e:
                last_err = e
                if "404" in str(e) or "429" in str(e) or "503" in str(e):
                    continue
                raise e
        raise last_err

    def check_rate_limit(self, user):
        cache_key = f"ai_rate_limit_{user.id}"
        requests = cache.get(cache_key, 0)
        if requests >= 20: # Increased limit for testing
            return False
        cache.set(cache_key, requests + 1, 60) 
        return True

    def get_system_prompt(self, request, agent_type):
        live_data = get_ai_context_data(request.user)
        
        prompt = f"You are a helpful AI Assistant acting as a {agent_type} agent inside CollabHub SaaS platform.\n"
        prompt += f"Format your response cleanly. Base your answers strictly on this live data if possible. Do not make up tasks, meetings, or HR records.\n"
        prompt += json.dumps(live_data, indent=2)
        return prompt, live_data

    def handle_database_first(self, message, live_data):
        """Database-first heuristic processing to skip LLM for basic queries."""
        lower_msg = message.lower()
        if any(w in lower_msg for w in ["my tasks", "pending tasks", "what are my tasks", "show tasks"]):
            if "error" in live_data or "detail" in live_data:
                return f"Debug Error fetching context: {str(live_data)}"
            tasks = live_data.get('tasks', [])
            if not tasks: return "You currently have no tasks assigned."
            return "Here are your tasks:\n" + "\n".join([f"- [{t.get('priority')}] {t.get('title')} ({t.get('status')})" for t in tasks])
            
        if any(w in lower_msg for w in ["my meetings", "schedule", "calendar"]):
            meetings = live_data.get('meetings', [])
            if not meetings: return "You have no upcoming meetings scheduled."
            return "Here are your upcoming meetings:\n" + "\n".join([f"- {m.get('title')} at {m.get('time')}" for m in meetings])
            
        if any(w in lower_msg for w in ["leave balance", "my leave"]):
            balance = live_data.get('hr', {}).get('leaveBalance', 0)
            return f"Your current leave balance is {balance} days."
            
        return None # Proceed to Gemini

    def generate_response(self, request, conversation, user_message, agent_type, action_type='chat', document_content=''):
        if not self.check_rate_limit(request.user):
            return {"error": "Rate limit exceeded. Please try again in a minute."}

        system_prompt, live_data = self.get_system_prompt(request, agent_type)
        
        # 1. Document Transformations (Skip Database-First for Docs)
        if agent_type == 'docs':
            if action_type == 'summarize':
                full_prompt = f"Summarize the following document content concisely:\n\n{document_content}"
            elif action_type == 'rewrite':
                full_prompt = f"Rewrite the following document content to be more professional and clear:\n\n{document_content}"
            elif action_type == 'translate':
                full_prompt = f"Translate the following document content to Spanish (or English if already Spanish):\n\n{document_content}"
            elif action_type == 'format':
                full_prompt = f"Format the following text nicely using Markdown:\n\n{document_content}"
            elif action_type == 'generate':
                full_prompt = f"Generate a document based on the following prompt/topic:\n\n{user_message}"
            else:
                full_prompt = f"System: You are an AI Docs editor.\n\nUser: {user_message}\n\nCurrent Document:\n{document_content}"
                
            try:
                result = self.try_generate_content(full_prompt)
                response_text = result.text
                
                estimated_tokens = len(full_prompt + response_text) // 4
                AIUsageLog.objects.create(
                    company=request.user.company if hasattr(request.user, 'company') else None,
                    user=request.user,
                    agent='docs',
                    tokens_used=estimated_tokens,
                    cost_estimate=estimated_tokens * 0.00001
                )
                return {"response": response_text}
            except Exception as e:
                return {"error": f"AI Docs Error: {str(e)}"}

        # 1.5 Spreadsheet Transformations (Skip Database-First for Sheets)
        if agent_type == 'sheets':
            if action_type == 'generate_formula':
                full_prompt = f"Provide ONLY the Excel/Google Sheets formula for the following request, no explanations:\n\n{user_message}"
            elif action_type == 'analyze':
                full_prompt = f"Analyze the following spreadsheet data (provided in CSV format) and provide key insights, trends, and a summary:\n\n{document_content}"
            elif action_type == 'create_template':
                full_prompt = f"Create a CSV spreadsheet template based on the following topic. Return ONLY the raw CSV text, no markdown backticks:\n\n{user_message}"
            else:
                full_prompt = f"System: You are an AI Spreadsheet assistant.\n\nUser: {user_message}\n\nCurrent Data:\n{document_content}"
                
            try:
                result = self.try_generate_content(full_prompt)
                response_text = result.text.strip()
                if response_text.startswith("```csv"):
                    response_text = response_text.replace("```csv", "").replace("```", "").strip()
                
                estimated_tokens = len(full_prompt + response_text) // 4
                AIUsageLog.objects.create(
                    company=request.user.company if hasattr(request.user, 'company') else None,
                    user=request.user,
                    agent='sheets',
                    tokens_used=estimated_tokens,
                    cost_estimate=estimated_tokens * 0.00001
                )
                return {"response": response_text}
            except Exception as e:
                return {"error": f"AI Sheets Error: {str(e)}"}

        # 1.7 Presentation Transformations (Skip Database-First for Slides)
        if agent_type == 'slides':
            if action_type == 'generate_presentation':
                full_prompt = f"Create a professional presentation based on the following topic/prompt: '{user_message}'.\n\nYou MUST return ONLY a valid JSON array of objects. Do not include markdown backticks like ```json. \nSchema: [{{ \"title\": \"Slide Title\", \"content\": [\"bullet 1\", \"bullet 2\"] }}]"
            else:
                full_prompt = f"System: You are an AI Presentation assistant.\n\nUser: {user_message}\n\nCurrent Data:\n{document_content}"
                
            try:
                result = self.try_generate_content(full_prompt)
                response_text = result.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text.replace("```json", "").replace("```", "").strip()
                elif response_text.startswith("```"):
                    response_text = response_text.replace("```", "").strip()
                
                estimated_tokens = len(full_prompt + response_text) // 4
                AIUsageLog.objects.create(
                    company=request.user.company if hasattr(request.user, 'company') else None,
                    user=request.user,
                    agent='slides',
                    tokens_used=estimated_tokens,
                    cost_estimate=estimated_tokens * 0.00001
                )
                return {"response": response_text}
            except Exception as e:
                return {"error": f"AI Slides Error: {str(e)}"}

        # 1.8 Meeting Assistant Transformations (Skip Database-First for Meetings)
        if agent_type == 'meeting':
            if action_type == 'summarize_meeting':
                full_prompt = f"Summarize the following meeting transcript/notes into a concise executive summary:\n\n{document_content}"
            elif action_type == 'extract_action_items':
                full_prompt = f"Extract a clear bulleted list of Action Items and Decisions from the following meeting transcript/notes. Format cleanly in Markdown:\n\n{document_content}"
            else:
                full_prompt = f"System: You are an AI Meeting Assistant.\n\nUser: {user_message}\n\nTranscript/Notes:\n{document_content}"
                
            try:
                result = self.try_generate_content(full_prompt)
                response_text = result.text.strip()
                
                estimated_tokens = len(full_prompt + response_text) // 4
                AIUsageLog.objects.create(
                    company=request.user.company if hasattr(request.user, 'company') else None,
                    user=request.user,
                    agent='meeting',
                    tokens_used=estimated_tokens,
                    cost_estimate=estimated_tokens * 0.00001
                )
                return {"response": response_text}
            except Exception as e:
                return {"error": f"AI Meeting Error: {str(e)}"}

        # 1.9 Code Transformations (Skip Database-First for Code)
        if agent_type == 'code':
            if action_type == 'generate_code':
                full_prompt = f"Generate code for the following request. Make sure the response is clean and well-commented:\n\n{user_message}"
            elif action_type == 'explain_code':
                full_prompt = f"Explain the following code snippet concisely:\n\n{document_content}"
            elif action_type == 'refactor_code':
                full_prompt = f"Refactor the following code to be cleaner, more efficient, and follow best practices. Provide the refactored code and a brief explanation of changes:\n\n{document_content}"
            elif action_type == 'debug_code':
                full_prompt = f"Find and fix any bugs in the following code. Provide the corrected code and explain what was wrong:\n\n{document_content}"
            else:
                full_prompt = f"System: You are an AI Pair Programmer.\n\nUser: {user_message}\n\nCurrent Code:\n{document_content}"
                
            try:
                result = self.try_generate_content(full_prompt)
                response_text = result.text.strip()
                
                estimated_tokens = len(full_prompt + response_text) // 4
                AIUsageLog.objects.create(
                    company=request.user.company if hasattr(request.user, 'company') else None,
                    user=request.user,
                    agent='code',
                    tokens_used=estimated_tokens,
                    cost_estimate=estimated_tokens * 0.00001
                )
                return {"response": response_text}
            except Exception as e:
                return {"error": f"AI Code Error: {str(e)}"}

        # 2. Database-First Routing (Intercept simple queries for Chat)
        db_response = self.handle_database_first(user_message, live_data)
        if db_response:
            # Skip Gemini, zero token cost!
            return {"response": db_response}

        # 2. Gemini Reasoning Routing
        previous_messages = conversation.messages.order_by('created_at')
        history = []
        for msg in previous_messages:
            if msg.content == user_message and msg.role == 'user':
                continue
            history.append({
                "role": "model" if msg.role == 'assistant' else "user",
                "parts": [{"text": msg.content}]
            })
            
        try:
            full_prompt = f"System Context: {system_prompt}\n\nUser: {user_message}"
            
            result = self.try_start_chat(history, full_prompt)
            response_text = result.text
            
            estimated_tokens = len(full_prompt + response_text) // 4
            AIUsageLog.objects.create(
                company=request.user.company if hasattr(request.user, 'company') else None,
                user=request.user,
                agent=agent_type,
                tokens_used=estimated_tokens,
                cost_estimate=estimated_tokens * 0.00001
            )
            
            return {"response": response_text}
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": f"AI Engine Error: {str(e)}"}
