from django.db import models
from core.tenant import TenantModel

class Course(TenantModel):
    title = models.CharField(max_length=255)
    employee_name = models.CharField(max_length=255, null=True, blank=True)
    language = models.CharField(max_length=100, default='English')
    course_level = models.CharField(max_length=100, null=True, blank=True)
    total_lectures = models.IntegerField(default=0)
    course_duration = models.CharField(max_length=100, null=True, blank=True)
    price_level = models.CharField(max_length=100, null=True, blank=True)
    image = models.ImageField(upload_to='course_images/', null=True, blank=True)
    
    # Textarea fields stored as text, we can parse them by newlines if needed, or we just store them as raw text.
    highlights = models.TextField(null=True, blank=True)
    learning_outcomes = models.TextField(null=True, blank=True)
    target_audience = models.TextField(null=True, blank=True)
    requirements = models.TextField(null=True, blank=True)

    # Legacy fields (keeping them to prevent breaking changes if used elsewhere)
    author = models.CharField(max_length=255, null=True, blank=True)
    level = models.IntegerField(default=1)
    category = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=100, default='Pending')
    is_free = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    exam_included = models.BooleanField(default=False)
    duration_days = models.IntegerField(default=0)
    lectures_count = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    reviews_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class CourseTopic(models.Model):
    course = models.ForeignKey(Course, related_name='topics', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)

class CoursePoint(models.Model):
    topic = models.ForeignKey(CourseTopic, related_name='points', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    video_link = models.URLField(max_length=500, null=True, blank=True)
    time = models.CharField(max_length=100, null=True, blank=True)

class CourseFAQ(models.Model):
    course = models.ForeignKey(Course, related_name='faqs', on_delete=models.CASCADE)
    question = models.CharField(max_length=500)
    answer = models.TextField()

class CourseAccessRequest(models.Model):
    course = models.ForeignKey(Course, related_name='access_requests', on_delete=models.CASCADE)
    employee_name = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='Pending') # Pending, Approved, Rejected
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_name} - {self.course.title} ({self.status})"

class CertificateTemplate(models.Model):
    name = models.CharField(max_length=255)
    background_image = models.ImageField(upload_to='certificates/', null=True, blank=True)
    title_text = models.CharField(max_length=255, default='Certificate of Completion')
    body_text = models.TextField(default='This certifies that {{employee_name}} has successfully completed the course.')
    signature_image = models.ImageField(upload_to='signatures/', null=True, blank=True)
    validity_days = models.IntegerField(default=365, help_text="Number of days the certificate is valid. 0 means infinite.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class UploadedVideo(models.Model):
    file = models.FileField(upload_to='course_videos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

class GlobalVideoSettings(models.Model):
    # This acts as a singleton, only the first row will be used.
    auto_pause = models.BooleanField(default=True)
    idle_timeout_seconds = models.IntegerField(default=120)
    disable_fast_forward = models.BooleanField(default=True)
    watch_percentage_required = models.IntegerField(default=80)
    assessment_question_count = models.IntegerField(default=50)
    assessment_passing_score = models.IntegerField(default=80)
    max_assessment_attempts = models.IntegerField(default=3)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Global Video Settings"

class VideoProgress(models.Model):
    employee_name = models.CharField(max_length=255)
    course_point = models.ForeignKey(CoursePoint, related_name='progress', on_delete=models.CASCADE)
    max_progress_seconds = models.FloatField(default=0.0)
    last_position_seconds = models.FloatField(default=0.0)
    is_completed = models.BooleanField(default=False)
    quiz_attempts = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee_name', 'course_point')

    def __str__(self):
        return f"{self.employee_name} - {self.course_point.name} - {'Completed' if self.is_completed else 'In Progress'}"

# --- Advanced Assessment & Quiz Architecture ---

class CoursePointQuestion(models.Model):
    course_point = models.ForeignKey(CoursePoint, related_name='mini_quiz', on_delete=models.CASCADE)
    question_text = models.CharField(max_length=1000)
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)
    correct_option = models.CharField(max_length=1, choices=[('A','A'), ('B','B'), ('C','C'), ('D','D')])

class QuestionBank(models.Model):
    course = models.ForeignKey(Course, related_name='question_bank', on_delete=models.CASCADE)
    question_text = models.CharField(max_length=1000)
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)
    correct_option = models.CharField(max_length=1, choices=[('A','A'), ('B','B'), ('C','C'), ('D','D')])

class AssessmentSession(models.Model):
    employee_name = models.CharField(max_length=255)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    passed = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AssessmentAnswer(models.Model):
    session = models.ForeignKey(AssessmentSession, related_name='answers', on_delete=models.CASCADE)
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, choices=[('A','A'), ('B','B'), ('C','C'), ('D','D')])
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'question')
