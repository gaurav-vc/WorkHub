from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, CourseAccessRequestViewSet, CertificateTemplateViewSet, GlobalVideoSettingsViewSet, VideoProgressViewSet, UploadedVideoViewSet, CoursePointQuestionViewSet, QuestionBankViewSet, AssessmentSessionViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'access_requests', CourseAccessRequestViewSet, basename='access-request')
router.register(r'certificates', CertificateTemplateViewSet, basename='certificate')
router.register(r'video_settings', GlobalVideoSettingsViewSet, basename='video-settings')
router.register(r'video_progress', VideoProgressViewSet, basename='video-progress')
router.register(r'uploaded_videos', UploadedVideoViewSet, basename='uploaded-videos')
router.register(r'course_point_questions', CoursePointQuestionViewSet, basename='course-point-questions')
router.register(r'question_bank', QuestionBankViewSet, basename='question-bank')
router.register(r'assessments', AssessmentSessionViewSet, basename='assessments')

urlpatterns = [
    path('', include(router.urls)),
]
