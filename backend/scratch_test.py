import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from Project.models import Task
from Project.serializers import TaskSerializer

# Try fetching with 1500 IDs chunked into 900
try:
    task_ids = list(range(1, 1500))
    final_data = []
    queryset = Task.objects.all().prefetch_related('comments')
    
    for i in range(0, len(task_ids), 900):
        chunk_ids = task_ids[i:i + 900]
        page_tasks = queryset.filter(id__in=chunk_ids)
        serializer = TaskSerializer(page_tasks, many=True)
        final_data.extend(serializer.data)
        
    print("SUCCESS! Length of data:", len(final_data))
except Exception as e:
    import traceback
    traceback.print_exc()
