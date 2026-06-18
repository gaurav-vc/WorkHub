from django.db import models

# All models have been moved to their respective domain apps:
# - Task, TaskChecklist, TaskComment, TaskChat, TaskAttachment -> Project
# - Meeting -> calendar_meeting
# - Approval -> hr_requests
# - TeamActivity, QuickLink -> workspace
# - UserProfile -> authentication
