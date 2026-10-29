import uuid
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from .models import Business, BusinessMembership, WorkspaceInvitation

User = get_user_model()

class BusinessProfileSerializer(serializers.ModelSerializer):
    """Serializer for business profile and onboarding wizard fields."""
    class Meta:
        model = Business
        fields = [
            'id',
            'name',
            'slug',
            'legal_name',
            'dba_name',
            'industry_category',
            'industry_code',
            'country',
            'state_province',
            'city',
            'postal_code',
            'operating_locations',
            'employee_count_band',
            'annual_revenue_band',
            'regulated_activities',
            'registration_identifier',
            'is_profile_complete',
            'completeness_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'is_profile_complete', 'completeness_percentage', 'created_at', 'updated_at']


class BusinessCreateSerializer(serializers.ModelSerializer):
    """Quick workspace creation on registration or new business addition."""
    class Meta:
        model = Business
        fields = ['id', 'name', 'industry_category', 'country', 'state_province']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else None
        business = Business.objects.create(
            name=validated_data['name'],
            industry_category=validated_data.get('industry_category', 'GENERAL'),
            country=validated_data.get('country', 'United States'),
            state_province=validated_data.get('state_province', ''),
            created_by=user,
        )
        # Assign creator as Owner
        if user and user.is_authenticated:
            BusinessMembership.objects.create(
                business=business,
                user=user,
                role=BusinessMembership.Role.OWNER,
            )
        return business


class BusinessMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = BusinessMembership
        fields = [
            'id',
            'business',
            'user',
            'user_email',
            'user_full_name',
            'role',
            'role_display',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'business', 'user', 'user_email', 'user_full_name', 'role_display', 'created_at']


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    is_valid = serializers.BooleanField(source='is_valid', read_only=True)

    class Meta:
        model = WorkspaceInvitation
        fields = [
            'id',
            'business',
            'business_name',
            'email',
            'role',
            'invited_by',
            'invited_by_email',
            'status',
            'expires_at',
            'token',
            'is_valid',
            'created_at',
        ]
        read_only_fields = ['id', 'invited_by', 'invited_by_email', 'status', 'token', 'expires_at', 'is_valid', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        token = uuid.uuid4().hex
        expires_at = timezone.now() + timedelta(days=7)
        return WorkspaceInvitation.objects.create(
            token=token,
            expires_at=expires_at,
            invited_by=request.user,
            **validated_data
        )
