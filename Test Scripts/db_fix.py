import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') 
try:
    django.setup()
    from learning_center.models import QuestionBank
    total = QuestionBank.objects.count()
    empty_qs = QuestionBank.objects.filter(question_text='')
    empty_count = empty_qs.count()
    print(f"Total questions: {total}")
    print(f"Empty questions: {empty_count}")
    if empty_count > 0:
        print("Deleting empty questions...")
        empty_qs.delete()
        print("Done.")
    
    # Let's print the remaining ones
    remaining = QuestionBank.objects.all()
    print(f"Remaining questions: {remaining.count()}")
    for q in remaining[:2]:
        print(f"Q: {q.question_text}")
except Exception as e:
    print(f"Error: {e}")
