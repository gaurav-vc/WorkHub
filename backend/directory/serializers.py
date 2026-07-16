from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
    # Read: expose as joinedDate for React
    joinedDate = serializers.CharField(source='joined_date', required=False, allow_blank=True)
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'initials', 'role', 'department',
            'email', 'phone', 'location', 'status',
            'joinedDate', 'date_of_birth', 'manager', 'skills', 'photo', 'website'
        ]

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def to_internal_value(self, data):
        # Accept both joinedDate (frontend) and joined_date (backend)
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'joinedDate' in mutable and 'joined_date' not in mutable:
            mutable['joined_date'] = mutable.pop('joinedDate')
        return super().to_internal_value(mutable)