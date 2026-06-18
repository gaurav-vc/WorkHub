from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
    # Map Django's 'joined_date' to React's 'joinedDate'
    joinedDate = serializers.CharField(source='joined_date')
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'initials', 'role', 'department',
            'email', 'phone', 'location', 'status',
            'joinedDate', 'manager', 'skills', 'photo', 'website'
        ]

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None