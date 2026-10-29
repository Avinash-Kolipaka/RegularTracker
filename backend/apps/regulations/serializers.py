from rest_framework import serializers
from .models import (
    RegulationSource,
    RegulatoryRequirement,
    RequirementVersion,
    BusinessRequirement,
    ApplicabilityReview,
)

class RegulationSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegulationSource
        fields = [
            'id',
            'name',
            'slug',
            'source_type',
            'official_url',
            'jurisdiction',
            'description',
            'is_active',
            'check_frequency_hours',
            'last_checked_at',
            'last_success_at',
            'created_at',
        ]


class RequirementVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequirementVersion
        fields = [
            'id',
            'version_number',
            'title',
            'summary',
            'change_summary',
            'effective_date',
            'published_at',
        ]


class RegulatoryRequirementSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    source_type = serializers.CharField(source='source.source_type', read_only=True)
    versions = RequirementVersionSerializer(many=True, read_only=True)

    class Meta:
        model = RegulatoryRequirement
        fields = [
            'id',
            'source',
            'source_name',
            'source_type',
            'reference_code',
            'title',
            'summary',
            'full_text',
            'jurisdiction',
            'industry_categories',
            'official_source_url',
            'publication_date',
            'effective_date',
            'mandatory_filing_deadline',
            'verification_status',
            'verified_at',
            'last_reviewed_at',
            'version_number',
            'applicability_criteria',
            'versions',
            'created_at',
        ]


class BusinessRequirementSerializer(serializers.ModelSerializer):
    requirement = RegulatoryRequirementSerializer(read_only=True)
    requirement_id = serializers.PrimaryKeyRelatedField(
        queryset=RegulatoryRequirement.objects.all(),
        source='requirement',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BusinessRequirement
        fields = [
            'id',
            'business',
            'requirement',
            'requirement_id',
            'status',
            'status_display',
            'match_reasons',
            'is_pinned',
            'notes',
            'last_evaluated_at',
            'created_at',
        ]
        read_only_fields = ['id', 'status_display', 'last_evaluated_at', 'created_at']


class ApplicabilityReviewSerializer(serializers.ModelSerializer):
    reviewer_email = serializers.EmailField(source='reviewer.email', read_only=True)

    class Meta:
        model = ApplicabilityReview
        fields = [
            'id',
            'business_requirement',
            'reviewer',
            'reviewer_email',
            'previous_status',
            'new_status',
            'decision_rationale',
            'created_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewer_email', 'previous_status', 'created_at']
