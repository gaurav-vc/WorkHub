import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') # Change backend.settings to actual project settings
try:
    django.setup()
    from learning_center.models import QuestionBank
    for q in QuestionBank.objects.all()[:5]:
        print(f"Q: {q.question_text}")
        print(f"A: {q.option_a}, B: {q.option_b}, C: {q.option_c}, D: {q.option_d}, Correct: {q.correct_option}")
except Exception as e:
    print(f"Error: {e}")
