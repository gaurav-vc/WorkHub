# resources/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Departments
    path('departments/',         views.department_list_create, name='res-dept-list'),
    path('departments/<int:dept_id>/', views.department_detail, name='res-dept-detail'),

    # Employees
    path('employees/',            views.employee_list_create, name='res-emp-list'),
    path('employees/<int:emp_id>/', views.employee_detail,   name='res-emp-detail'),

    # Workload dashboard (main endpoint for the React page)
    path('workload/',             views.workload_dashboard,   name='res-workload'),

    # Resource tasks (separate from api.Task)
    path('tasks/',                views.task_list_create,     name='res-task-list'),
    path('tasks/<int:task_id>/',  views.task_detail,          name='res-task-detail'),
    path('tasks/<int:task_id>/reassign/',        views.reassign_task,     name='res-task-reassign'),
    path('tasks/<int:task_id>/adjust_deadline/', views.adjust_deadline,   name='res-task-deadline'),

    # Capacity calendar
    path('capacity/',             views.capacity_calendar,    name='res-capacity'),

    # Time off
    path('timeoff/',              views.time_off_list_create, name='res-timeoff-list'),
    path('timeoff/<int:to_id>/',  views.time_off_detail,      name='res-timeoff-detail'),

    # Conflict detection
    path('conflicts/',            views.conflict_list,        name='res-conflicts'),
    path('conflicts/<int:conflict_id>/resolve/', views.resolve_conflict, name='res-conflict-resolve'),

    # Analytics
    path('analytics/',            views.analytics,            name='res-analytics'),

    # Employee suggestions
    path('suggest/',              views.suggest_employees,    name='res-suggest'),
]