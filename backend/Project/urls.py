from django.urls import path
from . import views
from . import report_views
from . import analytics_views

urlpatterns = [
    path('', views.project_list_create, name='project-list-create'),
    path('<int:project_id>/', views.project_detail, name='project-detail'),
    path('<int:project_id>/duplicate/', views.duplicate_project, name='duplicate-project'),
    path('<int:project_id>/export/', views.export_project, name='export-project'),
    path('<int:project_id>/add_task/', views.add_task, name='add-task'),
    path('tasks/<int:task_id>/', views.update_task, name='update-task'),
    path('tasks/<int:task_id>/upload/', views.upload_task_attachment, name='upload-task-attachment'),
    path('tasks/<int:task_id>/add_subtask/', views.add_subtask, name='add-subtask'),
    path('tasks/<int:task_id>/add_checklist/', views.add_checklist, name='add-checklist'),
    path('tasks/<int:task_id>/add_chat/', views.add_chat, name='add-chat'),
    path('tasks/<int:task_id>/add_comment/', views.add_comment, name='add-comment'),
    
    # Reports
    path('reports/employee-stats/', report_views.employee_stats_report, name='employee-stats-report'),
    
    # Excel Export
    path('export-multiple/', views.export_projects_excel, name='export-multiple-projects'),
    
    # Project Analytics
    path('analytics/all/', analytics_views.projects_analytics_all, name='projects-analytics-all'),
    path('analytics/<int:project_id>/', analytics_views.project_analytics_detail, name='project-analytics-detail'),
]