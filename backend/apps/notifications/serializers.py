from rest_framework import serializers
from .models import Notification, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'business',
            'title',
            'message',
            'notification_type',
            'notification_type_display',
            'is_read',
            'action_url',
            'created_at',
        ]
        read_only_fields = ['id', 'business', 'title', 'message', 'notification_type', 'notification_type_display', 'action_url', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'email_on_task_assignment',
            'email_on_deadline_approach',
            'email_on_regulatory_update',
            'email_on_document_expiry',
        ]
