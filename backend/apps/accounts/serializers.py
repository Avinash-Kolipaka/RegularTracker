from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile
from apps.businesses.models import BusinessMembership

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'phone_number',
            'job_title',
            'timezone',
            'avatar_url',
            'email_notifications_enabled',
            'in_app_notifications_enabled',
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    active_workspaces = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'system_role',
            'is_staff',
            'profile',
            'active_workspaces',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'system_role', 'is_staff', 'created_at']

    def get_active_workspaces(self, obj):
        memberships = BusinessMembership.objects.filter(
            user=obj,
            is_active=True
        ).select_related('business')
        return [
            {
                'business_id': m.business.id,
                'business_name': m.business.name,
                'business_slug': m.business.slug,
                'role': m.role,
                'role_display': m.get_role_display(),
                'is_profile_complete': m.business.is_profile_complete,
            }
            for m in memberships
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
