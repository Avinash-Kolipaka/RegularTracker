from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ComplianceTask, TaskChecklistItem, TaskComment
from apps.regulations.models import RegulatoryRequirement

User = get_user_model()

class TaskChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChecklistItem
        fields = [
            'id',
            'task',
            'title',
            'is_completed',
            'completed_at',
            'sort_order',
            'created_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = TaskComment
        fields = [
            'id',
            'task',
            'author',
            'author_email',
            'author_name',
            'content',
            'created_at',
        ]
        read_only_fields = ['id', 'author', 'author_email', 'author_name', 'created_at']


class ComplianceTaskSerializer(serializers.ModelSerializer):
    checklist_items = TaskChecklistItemSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    assignee_email = serializers.EmailField(source='assigned_to.email', read_only=True)
    assignee_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    requirement_code = serializers.CharField(source='requirement.reference_code', read_only=True)
    requirement_title = serializers.CharField(source='requirement.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = ComplianceTask
        fields = [
            'id',
            'business',
            'requirement',
            'requirement_code',
            'requirement_title',
            'title',
            'description',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'created_by',
            'assigned_to',
            'assignee_email',
            'assignee_name',
            'due_date',
            'completed_at',
            'is_ai_draft',
            'checklist_items',
            'comments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'status_display', 'priority_display', 'created_at', 'updated_at']
