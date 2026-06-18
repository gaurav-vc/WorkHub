from django.urls import path
from . import views

urlpatterns = [
    # Catches: /api/myday/dashboard/
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # Catches: /api/myday/approvals/1/action/
    path('approvals/<int:approval_id>/action/', views.handle_approval, name='handle_approval'),
    
    # Catches: /api/myday/tasks/create/
    path('tasks/create/', views.create_task, name='create_task'),
    
    # Catches: /api/myday/tasks/1/toggle/
    path('tasks/<int:task_id>/toggle/', views.toggle_task, name='toggle_task'),
    
    # Catches: /api/myday/ai-context/
    path('ai-context/', views.ai_context_view, name='ai_context'),
]