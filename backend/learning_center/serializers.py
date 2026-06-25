from rest_framework import serializers
from .models import Course, CourseTopic, CoursePoint, CourseFAQ, CourseAccessRequest, CertificateTemplate, GlobalVideoSettings, VideoProgress, UploadedVideo, CoursePointQuestion, QuestionBank, AssessmentSession, AssessmentAnswer
import json

class CoursePointQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoursePointQuestion
        fields = '__all__'

class CoursePointSerializer(serializers.ModelSerializer):
    mini_quiz = CoursePointQuestionSerializer(many=True, required=False)
    class Meta:
        model = CoursePoint
        fields = ['id', 'name', 'video_link', 'time', 'mini_quiz']

class CourseTopicSerializer(serializers.ModelSerializer):
    points = CoursePointSerializer(many=True, required=False)

    class Meta:
        model = CourseTopic
        fields = ['id', 'title', 'points']

class CourseFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseFAQ
        fields = ['id', 'question', 'answer']

class CourseAccessRequestSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')

    class Meta:
        model = CourseAccessRequest
        fields = ['id', 'course', 'course_title', 'employee_name', 'status', 'created_at']

class CertificateTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplate
        fields = '__all__'

class UploadedVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedVideo
        fields = '__all__'

class GlobalVideoSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalVideoSettings
        fields = '__all__'

class VideoProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoProgress
        fields = '__all__'



class QuestionBankSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionBank
        fields = '__all__'

class AssessmentSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentSession
        fields = '__all__'

class AssessmentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAnswer
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    topics = CourseTopicSerializer(many=True, required=False)
    faqs = CourseFAQSerializer(many=True, required=False)

    class Meta:
        model = Course
        fields = '__all__'

    def create(self, validated_data):
        topics_data = []
        faqs_data = []

        # The frontend sends topics and faqs as JSON strings when using FormData (because of image upload)
        request = self.context.get('request')
        if request and 'topics' in request.data:
            try:
                topics_data = json.loads(request.data.get('topics'))
            except Exception:
                topics_data = validated_data.pop('topics', [])
        else:
            topics_data = validated_data.pop('topics', [])

        if request and 'faqs' in request.data:
            try:
                faqs_data = json.loads(request.data.get('faqs'))
            except Exception:
                faqs_data = validated_data.pop('faqs', [])
        else:
            faqs_data = validated_data.pop('faqs', [])

        request = self.context.get('request')
        org = None
        if request and hasattr(request.user, 'auth_profile') and request.user.auth_profile.organization:
            org = request.user.auth_profile.organization
            
        course = Course.objects.create(organization=org, **validated_data)

        # Create Topics and Points
        for topic_data in topics_data:
            points_data = topic_data.pop('points', [])
            topic = CourseTopic.objects.create(course=course, **topic_data)
            for point_data in points_data:
                quiz_data = point_data.pop('mini_quiz', [])
                point = CoursePoint.objects.create(topic=topic, **point_data)
                for q_data in quiz_data:
                    CoursePointQuestion.objects.create(course_point=point, **q_data)

        # Create FAQs
        for faq_data in faqs_data:
            CourseFAQ.objects.create(course=course, **faq_data)

        return course

    def update(self, instance, validated_data):
        topics_data = []
        faqs_data = []

        request = self.context.get('request')
        if request and 'topics' in request.data:
            try:
                topics_data = json.loads(request.data.get('topics'))
            except Exception:
                topics_data = validated_data.pop('topics', [])
        else:
            topics_data = validated_data.pop('topics', [])

        if request and 'faqs' in request.data:
            try:
                faqs_data = json.loads(request.data.get('faqs'))
            except Exception:
                faqs_data = validated_data.pop('faqs', [])
        else:
            faqs_data = validated_data.pop('faqs', [])

        # Update course fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Topics and Points by simply replacing them if provided
        if request and 'topics' in request.data:
            instance.topics.all().delete()
            for topic_data in topics_data:
                points_data = topic_data.pop('points', [])
                topic = CourseTopic.objects.create(course=instance, **topic_data)
                for point_data in points_data:
                    quiz_data = point_data.pop('mini_quiz', [])
                    point = CoursePoint.objects.create(topic=topic, **point_data)
                    for q_data in quiz_data:
                        CoursePointQuestion.objects.create(course_point=point, **q_data)

        # Update FAQs by replacing them if provided
        if request and 'faqs' in request.data:
            instance.faqs.all().delete()
            for faq_data in faqs_data:
                CourseFAQ.objects.create(course=instance, **faq_data)

        return instance
