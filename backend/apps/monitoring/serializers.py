from rest_framework import serializers
from .models import SourceMonitoringRun, RegulatoryChange

class SourceMonitoringRunSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SourceMonitoringRun
        fields = [
            'id',
            'source',
            'source_name',
            'status',
            'status_display',
            'started_at',
            'completed_at',
            'items_scanned',
            'changes_detected',
            'error_message',
            'execution_log',
        ]


class RegulatoryChangeSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    review_status_display = serializers.CharField(source='get_review_status_display', read_only=True)
    reviewer_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = RegulatoryChange
        fields = [
            'id',
            'monitoring_run',
            'source',
            'source_name',
            'requirement',
            'reference_code',
            'title',
            'change_type',
            'change_type_display',
            'summary',
            'previous_text',
            'new_text',
            'diff_payload',
            'previous_hash',
            'new_hash',
            'source_url',
            'publication_date',
            'effective_date',
            'review_status',
            'review_status_display',
            'reviewed_by',
            'reviewer_email',
            'reviewed_at',
            'review_notes',
            'created_at',
        ]
        read_only_fields = ['id', 'monitoring_run', 'change_type_display', 'review_status_display', 'reviewer_email', 'reviewed_at', 'created_at']
