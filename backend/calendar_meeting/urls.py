from django.urls import path
from . import views

urlpatterns = [
    path('events/', views.event_list, name='event_list'),
    path('events/create/', views.event_create, name='event_create'),
    path('events/<int:pk>/update/', views.event_update, name='event_update'),
    path('events/<int:pk>/delete/', views.event_delete, name='event_delete'),
    path('tasks/create/', views.create_task_calendar, name='create_task_calendar'),
    path('employees/', views.get_all_employees, name='get_all_employees'),
]
