def get_normalized_site_modules(user):
    site_modules = []
    try:
        org_profile = getattr(user, 'org_profile', None)
        if org_profile and org_profile.site and org_profile.site.modules_access:
            site_modules = org_profile.site.modules_access
    except Exception:
        pass

    legacy_module_map = {
        # Old IDs
        'my-day': 'tasks-my-day',
        'calendar': 'tasks-calendar',
        'projects': 'tasks-projects',
        'resources': 'tasks-resources',
        'templates': 'tasks-templates',
        'mom': 'mom-list',
        'chat': 'team-chat',
        'docs': 'docs-notes',
        'wiki': 'knowledge-base',
        'boards': 'custom-boards',
        'pulse': 'company-pulse',
        'hr-directory': 'employee-directory',
        'hr-attendance': 'attendance',
        'hr-recognition': 'recognition',
        'hr-policies': 'company-policies',
        'ai-workflows': 'workflow-automation',
        'ai-insights': 'predictive-insights',
        
        # Labels from old AddSite logic
        'Dashboard': 'dashboard',
        'My Day': 'tasks-my-day',
        'Calendar Meetings': 'tasks-calendar',
        'Inbox': 'tasks-inbox',
        'Projects': 'tasks-projects',
        'Resource Planning': 'tasks-resources',
        'Template Marketplace': 'tasks-templates',
        'Minutes of Meeting': 'mom-list',
        'Team Chat': 'team-chat',
        'Docs & Notes': 'docs-notes',
        'Knowledge Base': 'knowledge-base',
        'Custom Boards': 'custom-boards',
        'Learning Center': 'learning-center',
        'Company Pulse': 'company-pulse',
        'HR Requests': 'hr-requests',
        'Directory': 'employee-directory',
        'Attendance': 'attendance',
        'Recognition': 'recognition',
        'Policies': 'company-policies',
        'Workflow Automation': 'workflow-automation',
        'Predictive Insights': 'predictive-insights',
        'AI Agents': 'ai-agents',
    }
    
    normalized_site_modules = set(site_modules)
    for module in site_modules:
        if module in legacy_module_map:
            normalized_site_modules.add(legacy_module_map[module])
            
    return normalized_site_modules

def is_site_admin_allowed_module(user, module_id):
    if not module_id:
        return True
        
    # Admin-specific modules or generic fallback bypasses
    if module_id.startswith('admin') or module_id.startswith('/admin'):
        return True
        
    normalized_modules = get_normalized_site_modules(user)
    return module_id in normalized_modules

MODULE_ID_TO_URLS = {
    'dashboard': '/',
    'tasks-my-day': '/tasks/my-day',
    'tasks-calendar': '/tasks/calendar',
    'tasks-inbox': '/inbox',
    'tasks-projects': '/tasks/projects',
    'tasks-resources': '/tasks/resources',
    'tasks-templates': '/tasks/templates',
    'mom-list': '/collaboration/moms',
    'my-card': '/my-card',
    'team-chat': '/collaboration/chat',
    'docs-notes': '/collaboration/docs',
    'knowledge-base': '/collaboration/wiki',
    'custom-boards': '/collaboration/boards',
    'learning-center': '/learning',
    'company-pulse': '/hr/company-pulse',
    'hr-requests': '/hr/requests',
    'employee-directory': '/hr/directory',
    'attendance': '/hr/attendance',
    'recognition': '/hr/recognition',
    'company-policies': '/hr/policies',
    'workflow-automation': '/ai/workflows',
    'predictive-insights': '/ai/insights',
    'ai-agents': '/ai/agents',
}
