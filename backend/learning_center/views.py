from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Course, CourseAccessRequest, CertificateTemplate, GlobalVideoSettings, VideoProgress, UploadedVideo, CoursePointQuestion, QuestionBank, AssessmentSession, AssessmentAnswer
from .serializers import CourseSerializer, CourseAccessRequestSerializer, CertificateTemplateSerializer, GlobalVideoSettingsSerializer, VideoProgressSerializer, UploadedVideoSerializer, CoursePointQuestionSerializer, QuestionBankSerializer, AssessmentSessionSerializer, AssessmentAnswerSerializer
import csv
import random
import datetime
from django.utils import timezone
from django.db import transaction

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by('-created_at')
    serializer_class = CourseSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

class CourseAccessRequestViewSet(viewsets.ModelViewSet):
    queryset = CourseAccessRequest.objects.all().order_by('-created_at')
    serializer_class = CourseAccessRequestSerializer
    filterset_fields = ['course', 'employee_name', 'status']

class CertificateTemplateViewSet(viewsets.ModelViewSet):
    queryset = CertificateTemplate.objects.all().order_by('-created_at')
    serializer_class = CertificateTemplateSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

class UploadedVideoViewSet(viewsets.ModelViewSet):
    queryset = UploadedVideo.objects.all().order_by('-uploaded_at')
    serializer_class = UploadedVideoSerializer
    parser_classes = (MultiPartParser, FormParser)

class GlobalVideoSettingsViewSet(viewsets.ModelViewSet):
    queryset = GlobalVideoSettings.objects.all()
    serializer_class = GlobalVideoSettingsSerializer

    def list(self, request, *args, **kwargs):
        settings, created = GlobalVideoSettings.objects.get_or_create(id=1)
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

class VideoProgressViewSet(viewsets.ModelViewSet):
    queryset = VideoProgress.objects.all()
    serializer_class = VideoProgressSerializer
    filterset_fields = ['employee_name', 'course_point']

class CoursePointQuestionViewSet(viewsets.ModelViewSet):
    queryset = CoursePointQuestion.objects.all()
    serializer_class = CoursePointQuestionSerializer
    filterset_fields = ['course_point']

class QuestionBankViewSet(viewsets.ModelViewSet):
    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankSerializer
    filterset_fields = ['course']

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        course_id = request.data.get('course_id')
        if not file or not course_id:
            return Response({'error': 'File and course_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            course = Course.objects.get(id=course_id)
            decoded_file = file.read().decode('utf-8-sig').splitlines()
            reader = csv.DictReader(decoded_file)
            
            questions_to_create = []
            for row in reader:
                # Normalize keys to lowercase and replace spaces with underscores to handle 'Option A' or 'option_a'
                normalized_row = {k.strip().lower().replace(' ', '_'): v for k, v in row.items() if k}
                questions_to_create.append(QuestionBank(
                    course=course,
                    question_text=normalized_row.get('question_text', normalized_row.get('question', '')),
                    option_a=normalized_row.get('option_a', ''),
                    option_b=normalized_row.get('option_b', ''),
                    option_c=normalized_row.get('option_c', ''),
                    option_d=normalized_row.get('option_d', ''),
                    correct_option=normalized_row.get('correct_option', normalized_row.get('correct_answer', 'A')).strip().upper()
                ))
            QuestionBank.objects.bulk_create(questions_to_create)
            return Response({'message': f'Successfully imported {len(questions_to_create)} questions.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def delete_empty(self, request):
        empty_qs = QuestionBank.objects.filter(question_text='')
        count = empty_qs.count()
        empty_qs.delete()
        return Response({'message': f'Deleted {count} empty questions.'})

class AssessmentSessionViewSet(viewsets.ModelViewSet):
    queryset = AssessmentSession.objects.all()
    serializer_class = AssessmentSessionSerializer
    filterset_fields = ['employee_name', 'course']

    @action(detail=False, methods=['post'])
    def start(self, request):
        employee_name = request.data.get('employee_name')
        course_id = request.data.get('course_id')
        if not employee_name or not course_id:
            return Response({'error': 'employee_name and course_id required'}, status=400)
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found or access denied.'}, status=400)
        settings = GlobalVideoSettings.objects.first()
        question_count = settings.assessment_question_count if settings else 50
        max_attempts = settings.max_assessment_attempts if settings else 3
        
        # Check attempts
        user_type = getattr(getattr(request.user, 'auth_profile', None), 'user_type', 'employee')
        attempts = AssessmentSession.objects.filter(employee_name=employee_name, course=course, is_completed=True).count()
        if user_type == 'employee' and attempts >= max_attempts:
            return Response({'error': f'You have exceeded the maximum number of attempts ({max_attempts}) for this course.'}, status=403)
        
        # Get random questions
        all_qs = list(QuestionBank.objects.filter(course=course))
        random.shuffle(all_qs)
        selected_qs = all_qs[:question_count]
        
        if not selected_qs:
            return Response({'error': 'No questions available for this course.'}, status=400)

        # Create session
        session = AssessmentSession.objects.create(employee_name=employee_name, course=course)
        
        # Return questions WITHOUT correct_option
        questions_data = []
        for q in selected_qs:
            questions_data.append({
                'id': q.id,
                'question_text': q.question_text,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
            })
            
        return Response({
            'session_id': session.id,
            'questions': questions_data
        })

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        session = self.get_object()
        if session.is_completed:
            return Response({'error': 'Session already completed.'}, status=400)
            
        question_id = request.data.get('question_id')
        selected_option = request.data.get('selected_option')
        
        try:
            question = QuestionBank.objects.get(id=question_id)
        except QuestionBank.DoesNotExist:
            return Response({'error': 'Invalid question.'}, status=400)

        # Ensure answer not already locked
        if AssessmentAnswer.objects.filter(session=session, question=question).exists():
            return Response({'error': 'Answer already submitted for this question.'}, status=400)

        is_correct = (question.correct_option == selected_option)
        AssessmentAnswer.objects.create(
            session=session,
            question=question,
            selected_option=selected_option,
            is_correct=is_correct
        )
        return Response({'success': True, 'is_correct': is_correct, 'correct_option': question.correct_option})
        
    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        session = self.get_object()
        answers = AssessmentAnswer.objects.filter(session=session)
        total_questions = answers.count()
        if total_questions == 0:
            return Response({'error': 'No answers submitted.'}, status=400)
            
        correct_answers = answers.filter(is_correct=True).count()
        score_percent = (correct_answers / total_questions) * 100
        
        settings = GlobalVideoSettings.objects.first()
        passing_score = settings.assessment_passing_score if settings else 80
        max_attempts = settings.max_assessment_attempts if settings else 3
        
        session.score = score_percent
        session.passed = score_percent >= passing_score
        session.is_completed = True
        session.save()
        
        attempts_taken = AssessmentSession.objects.filter(employee_name=session.employee_name, course=session.course, is_completed=True).count()
        user_type = getattr(getattr(request.user, 'auth_profile', None), 'user_type', 'employee')
        if user_type == 'employee':
            attempts_left = max_attempts - attempts_taken
        else:
            attempts_left = 999
        
        return Response({
            'score': session.score,
            'passed': session.passed,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'attempts_left': attempts_left if attempts_left >= 0 else 0
        })

    @action(detail=False, methods=['get'])
    def my_certificates(self, request):
        employee_name = request.query_params.get('employee_name')
        if not employee_name:
            return Response({'error': 'employee_name required'}, status=400)
        
        template = CertificateTemplate.objects.first()
        validity_days = template.validity_days if template else 365
        
        if validity_days > 0:
            expiration_date = timezone.now() - datetime.timedelta(days=validity_days)
            sessions = AssessmentSession.objects.filter(employee_name=employee_name, passed=True, updated_at__gte=expiration_date).order_by('-updated_at')
        else:
            sessions = AssessmentSession.objects.filter(employee_name=employee_name, passed=True).order_by('-updated_at')
        
        template_data = CertificateTemplateSerializer(template).data if template else None

        data = []
        for session in sessions:
            data.append({
                'id': session.id,
                'course_id': session.course.id,
                'course_title': session.course.title,
                'score': session.score,
                'date': session.updated_at,
                'template': template_data
            })
        return Response(data)

    def create(self, request, *args, **kwargs):
        employee_name = request.data.get('employee_name')
        course_point_id = request.data.get('course_point')
        
        progress, created = VideoProgress.objects.get_or_create(
            employee_name=employee_name,
            course_point_id=course_point_id
        )
        
        # Update fields if provided
        if 'max_progress_seconds' in request.data:
            progress.max_progress_seconds = max(progress.max_progress_seconds, float(request.data['max_progress_seconds']))
        if 'last_position_seconds' in request.data:
            progress.last_position_seconds = float(request.data['last_position_seconds'])
        if 'is_completed' in request.data:
            progress.is_completed = request.data['is_completed']
            
        progress.save()
        serializer = self.get_serializer(progress)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
