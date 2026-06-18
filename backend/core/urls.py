from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from Project.views import TaskViewSet
from timeline.views import GanttTaskViewSet
from . import views as core_views

router = SimpleRouter()
router.register(r'timeline', GanttTaskViewSet, basename='timeline')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. SPECIFIC PATHS FIRST
    # Django will check these specific folders first so they don't get trapped.
    path('api/resources/', include('resources.urls')),
    path('api/projects/', include('Project.urls')), 
    path('api/myday/', include('MyDay.urls')),
    path('api/auth/', include('authentication.urls')),
    path('auth/', include('authentication.urls')), # Alias for testing scripts
    path('api/rbac/', include('role_base_access.urls')),
    path('api/calendar/', include('calendar_meeting.urls')),
    path('api/workspace/', include('workspace.urls')),
    path('api/organization/', include('organization.urls')),
    path('api/mom/', include('mom.urls')),
    
    # Legacy / top-level API routes moved from api app
    path('api/', core_views.home, name='home'),
    path('api/debug/', core_views.debug, name='debug'),
    path('api/', include(router.urls)),

    # 2. BROAD / CATCH-ALL PATHS LAST
    # If the URL doesn't match the specific ones above, it will fall down to these.
    path('api/templates/', include('templatesapp.urls')),
    path('api/docs/', include('docs.urls')),
    path('api/kb/', include('knowledge_base.urls')),
    path('api/boards/', include('boards.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/hr/', include('hr_requests.urls')),
    path('api/company/', include('policies.urls')),
    path('api/directory/', include('directory.urls')),
    path('api/recognition/', include('recognition.urls')),
    path('api/workflows/', include('workflows.urls')),
    path('api/integrations/', include('integrations.urls')),
    path('api/admin_settings/', include('admin_settings.urls')),
    path('api/branding/', include('branding.urls')),
    path('api/insights/', include('insights.urls')),
    path('api/ai_agents/', include('ai_agents.urls')),
    path('api/learning_center/', include('learning_center.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)