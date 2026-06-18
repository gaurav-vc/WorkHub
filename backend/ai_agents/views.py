import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIAgent, AIConversation, AIMessage
from .services import AIGatewayService
from django.utils import timezone
import traceback

class AIAgentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AIAgent.objects.all()
    
    @action(detail=False, methods=['post'])
    def invoke(self, request):
        """
        Central AI Gateway Router.
        Validates permissions, sets up RBAC context, routes to correct agent tool logic via AIGatewayService.
        """
        try:
            user = request.user
            
            # Ensure user has a company for tenant isolation (handle edge case where they might not)
            company_obj = getattr(user, 'company', None)
            if not company_obj and hasattr(user, 'auth_profile'):
                company_obj = getattr(user.auth_profile, 'company', None)
            
            company = company_obj.name if company_obj and hasattr(company_obj, 'name') else str(company_obj) if company_obj else None
                
            agent_type = request.data.get('agent', 'chat')
            message = request.data.get('message', '')
            action_type = request.data.get('action', 'chat') # e.g., 'summarize', 'rewrite'
            document_content = request.data.get('document_content', '')
            conversation_id = request.data.get('conversation_id', None)
            
            if not message and not document_content:
                return Response({"error": "Message or Document Content is required"}, status=status.HTTP_400_BAD_REQUEST)
                
            # 1. Load or Create Conversation
            if conversation_id:
                try:
                    # Security: Ensure user owns this conversation
                    conversation = AIConversation.objects.get(id=conversation_id, user=user)
                except AIConversation.DoesNotExist:
                    return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                conversation = AIConversation.objects.create(
                    user=user, 
                    company=company,
                    agent=agent_type,
                    title=(message[:50] + "...") if message else (action_type + " action")
                )
                
            # 2. Log User Message
            AIMessage.objects.create(
                conversation=conversation,
                role='user',
                content=message or f"[{action_type} on document]"
            )
            
            # 3. Call AI Gateway Service (Gemini Integration)
            gateway = AIGatewayService()
            result = gateway.generate_response(request, conversation, message, agent_type, action_type, document_content)
            
            if "error" in result:
                return Response({"response": f"🚨 GATEWAY ERROR 🚨\n\n{result['error']}"}, status=status.HTTP_200_OK)
                
            response_text = result["response"]
            
            # 4. Log AI Response
            AIMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=response_text
            )
            
            return Response({"response": response_text}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"response": f"🚨 BACKEND CRASHED 🚨\n\nException: {str(e)}\n\nTraceback: {traceback.format_exc()}"}, status=status.HTTP_200_OK)