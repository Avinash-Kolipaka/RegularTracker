from rest_framework import serializers
from .models import AuditEvent

class AuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            'id',
            'business',
            'actor',
            'actor_email',
            'action',
            'action_display',
            'entity_type',
            'entity_id',
            'description',
            'ip_address',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields
