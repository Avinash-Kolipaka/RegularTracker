from rest_framework import serializers
from .models import ComplianceDocument, DocumentVersion

class DocumentVersionSerializer(serializers.ModelSerializer):
    uploader_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id',
            'version_number',
            'file_size_bytes',
            'sha256_hash',
            'change_notes',
            'uploader_email',
            'created_at',
        ]


class ComplianceDocumentSerializer(serializers.ModelSerializer):
    uploader_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    requirement_code = serializers.CharField(source='requirement.reference_code', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)

    class Meta:
        model = ComplianceDocument
        fields = [
            'id',
            'business',
            'requirement',
            'requirement_code',
            'task',
            'task_title',
            'title',
            'description',
            'category',
            'category_display',
            'original_filename',
            'file_size_bytes',
            'mime_type',
            'sha256_hash',
            'expiration_date',
            'is_archived',
            'version_number',
            'uploaded_by',
            'uploader_email',
            'versions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'original_filename',
            'file_size_bytes',
            'mime_type',
            'sha256_hash',
            'version_number',
            'uploaded_by',
            'uploader_email',
            'created_at',
            'updated_at',
        ]
