from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

User = get_user_model()

class RegisterView(APIView):
    """Register a new user account and return JWT authentication tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            # Log registration in audit log
            log_audit_event(
                action=AuditEvent.Action.AUTH_LOGIN,
                description=f"User {user.email} registered an account",
                actor=user,
                entity_type='User',
                entity_id=str(user.id),
                request=request
            )

            return Response({
                'message': 'Account created successfully.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """Retrieve or update currently authenticated user profile and workspaces."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()

        # Update profile fields if provided
        profile_data = request.data.get('profile', {})
        if profile_data and hasattr(user, 'profile'):
            profile_serializer = UserProfileSerializer(user.profile, data=profile_data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()

        return Response(UserSerializer(user).data)


class PasswordResetRequestView(APIView):
    """Request a password reset link/token. Development-safe fallback with console delivery."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()
            user = User.objects.filter(email=email).first()
            if user:
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"/reset-password?uid={uidb64}&token={token}"
                
                # Development email dispatch
                try:
                    send_mail(
                        subject="RegulaTrack - Password Reset Request",
                        message=f"You requested a password reset. Use link: {reset_link}",
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@regulatrack.local'),
                        recipient_list=[email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

                return Response({
                    'message': 'If an account exists with this email, a reset link has been dispatched.',
                    'dev_token': token if settings.DEBUG else None,
                    'dev_uid': uidb64 if settings.DEBUG else None,
                })
            # Return same message to prevent email enumeration
            return Response({'message': 'If an account exists with this email, a reset link has been dispatched.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """Confirm password reset using uid and token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uidb64 or not token or not new_password:
            return Response({'error': 'Missing required parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password has been updated successfully.'})
        return Response({'error': 'Reset token is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
