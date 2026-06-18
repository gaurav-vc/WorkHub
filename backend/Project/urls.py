from django.urls import path
from . import views

urlpatterns = [
    path('', views.project_list_create, name='project-list-create'),
    path('<int:project_id>/', views.project_detail, name='project-detail'),
    path('<int:project_id>/add_task/', views.add_task, name='add-task'),
    path('tasks/<int:task_id>/', views.update_task, name='update-task'),
    path('tasks/<int:task_id>/upload/', views.upload_task_attachment, name='upload-task-attachment'),
    path('tasks/<int:task_id>/add_subtask/', views.add_subtask, name='add-subtask'),
    path('tasks/<int:task_id>/add_checklist/', views.add_checklist, name='add-checklist'),
    path('tasks/<int:task_id>/add_chat/', views.add_chat, name='add-chat'),
    path('tasks/<int:task_id>/add_comment/', views.add_comment, name='add-comment'),
]