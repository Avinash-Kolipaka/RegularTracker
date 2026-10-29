from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Business, BusinessMembership, WorkspaceInvitation
from .serializers import (
    BusinessProfileSerializer,
    BusinessCreateSerializer,
    BusinessMembershipSerializer,
    WorkspaceInvitationSerializer,
)
from .permissions import IsPlatformAdmin, WorkspacePermissionHelper
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

User = get_user_model()

class BusinessListCreateView(APIView):
    """List workspaces the user is a member of, or create a new workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'system_role', None) == 'PLATFORM_ADMIN':
            businesses = Business.objects.all().order_by('name')
        else:
            memberships = BusinessMembership.objects.filter(
                user=request.user,
                is_active=True
            ).values_list('business_id', flat=True)
            businesses = Business.objects.filter(id__in=memberships).order_by('name')
        
        serializer = BusinessProfileSerializer(businesses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = BusinessCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            business = serializer.save()

            log_audit_event(
                action=AuditEvent.Action.WORKSPACE_CREATED,
                description=f"Workspace '{business.name}' created by {request.user.email}",
                actor=request.user,
                business=business,
                entity_type='Business',
                entity_id=str(business.id),
                request=request
            )

            return Response(BusinessProfileSerializer(business).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BusinessDetailView(APIView):
    """Retrieve or update business workspace profile settings."""
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        business = get_object_or_404(Business, pk=pk)
        if not WorkspacePermissionHelper.is_workspace_member(user, business.id):
            return None
        return business

    def get(self, request, pk):
        business = self.get_object(pk, request.user)
        if not business:
            return Response({'error': 'You do not have permission to access this workspace.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = BusinessProfileSerializer(business)
        return Response(serializer.data)

    def patch(self, request, pk):
        business = self.get_object(pk, request.user)
        if not business:
            return Response({'error': 'You do not have permission to access this workspace.'}, status=status.HTTP_403_FORBIDDEN)

        # Check permission: Owner, Manager, or Admin
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business.id):
            return Response({'error': 'Only workspace owners or compliance managers can update business profiles.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = BusinessProfileSerializer(business, data=request.data, partial=True)
        if serializer.is_valid():
            updated_business = serializer.save()

            log_audit_event(
                action=AuditEvent.Action.PROFILE_UPDATED,
                description=f"Profile for '{updated_business.name}' updated",
                actor=request.user,
                business=updated_business,
                entity_type='Business',
                entity_id=str(updated_business.id),
                request=request
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BusinessMembersListView(APIView):
    """List members of a workspace or add a direct member."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, pk):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        memberships = BusinessMembership.objects.filter(
            business_id=pk,
            is_active=True
        ).select_related('user', 'business')
        serializer = BusinessMembershipSerializer(memberships, many=True)
        return Response(serializer.data)


class BusinessMemberDetailView(APIView):
    """Update a member's role or deactivate their membership."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, business_id, member_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        membership = get_object_or_404(BusinessMembership, pk=member_id, business_id=business_id)
        new_role = request.data.get('role')
        if new_role and new_role in BusinessMembership.Role.values:
            membership.role = new_role
            membership.save()

            log_audit_event(
                action=AuditEvent.Action.ROLE_CHANGED,
                description=f"Changed {membership.user.email} role to {new_role}",
                actor=request.user,
                business_id=business_id,
                entity_type='BusinessMembership',
                entity_id=str(membership.id),
                request=request
            )

            return Response(BusinessMembershipSerializer(membership).data)
        return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, business_id, member_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        membership = get_object_or_404(BusinessMembership, pk=member_id, business_id=business_id)
        membership.is_active = False
        membership.save()

        log_audit_event(
            action=AuditEvent.Action.MEMBER_REMOVED,
            description=f"Deactivated membership for {membership.user.email}",
            actor=request.user,
            business_id=business_id,
            entity_type='BusinessMembership',
            entity_id=str(membership.id),
            request=request
        )

        return Response({'message': 'Membership deactivated.'}, status=status.HTTP_204_NO_CONTENT)


class WorkspaceInvitationListView(APIView):
    """List pending invitations or send a new invitation."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        invitations = WorkspaceInvitation.objects.filter(
            business_id=business_id,
            status=WorkspaceInvitation.Status.PENDING
        )
        serializer = WorkspaceInvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        business = get_object_or_404(Business, pk=business_id)
        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', BusinessMembership.Role.EMPLOYEE)

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if already active member
        existing_user = User.objects.filter(email=email).first()
        if existing_user and BusinessMembership.objects.filter(business=business, user=existing_user, is_active=True).exists():
            return Response({'error': 'This user is already an active member of this workspace.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = WorkspaceInvitationSerializer(
            data={'business': business.id, 'email': email, 'role': role},
            context={'request': request}
        )
        if serializer.is_valid():
            invitation = serializer.save()

            log_audit_event(
                action=AuditEvent.Action.MEMBER_INVITED,
                description=f"Sent invitation to {email} as {role}",
                actor=request.user,
                business=business,
                entity_type='WorkspaceInvitation',
                entity_id=str(invitation.id),
                request=request
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspaceInvitationAcceptView(APIView):
    """Accept an invitation to join a business workspace using token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Invitation token required.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation = get_object_or_404(WorkspaceInvitation, token=token)
        if not invitation.is_valid():
            return Response({'error': 'Invitation has expired or is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create or reactivate membership
        membership, created = BusinessMembership.objects.get_or_create(
            business=invitation.business,
            user=request.user,
            defaults={'role': invitation.role, 'is_active': True}
        )
        if not created:
            membership.role = invitation.role
            membership.is_active = True
            membership.save()

        invitation.status = WorkspaceInvitation.Status.ACCEPTED
        invitation.save()

        return Response({
            'message': f"Successfully joined {invitation.business.name} as {membership.get_role_display()}.",
            'business_id': invitation.business.id,
            'business_name': invitation.business.name,
            'role': membership.role,
        })
