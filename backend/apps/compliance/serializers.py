from rest_framework import serializers
from .models import ComplianceDeadline, RenewalRecord, InspectionRecord

class ComplianceDeadlineSerializer(serializers.ModelSerializer):
    requirement_code = serializers.CharField(source='requirement.reference_code', read_only=True)
    requirement_title = serializers.CharField(source='requirement.title', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    assignee_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    deadline_type_display = serializers.CharField(source='get_deadline_type_display', read_only=True)

    class Meta:
        model = ComplianceDeadline
        fields = [
            'id',
            'business',
            'requirement',
            'requirement_code',
            'requirement_title',
            'task',
            'task_title',
            'title',
            'description',
            'deadline_type',
            'deadline_type_display',
            'due_date',
            'is_official_statutory',
            'status',
            'status_display',
            'reminder_days_before',
            'assigned_to',
            'assignee_name',
            'completed_at',
            'created_at',
        ]
        read_only_fields = ['id', 'status_display', 'deadline_type_display', 'created_at']


class RenewalRecordSerializer(serializers.ModelSerializer):
    cycle_display = serializers.CharField(source='get_renewal_cycle_display', read_only=True)

    class Meta:
        model = RenewalRecord
        fields = [
            'id',
            'business',
            'name',
            'category',
            'issuing_authority',
            'renewal_cycle',
            'cycle_display',
            'current_expiry_date',
            'next_renewal_deadline',
            'is_active',
            'notes',
            'created_at',
        ]


class InspectionRecordSerializer(serializers.ModelSerializer):
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = InspectionRecord
        fields = [
            'id',
            'business',
            'inspecting_agency',
            'inspector_name',
            'scheduled_date',
            'conducted_date',
            'outcome',
            'outcome_display',
            'summary_findings',
            'corrective_actions_required',
            'created_at',
        ]
