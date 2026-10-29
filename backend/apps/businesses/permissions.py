from rest_framework import permissions
from .models import BusinessMembership

class IsPlatformAdmin(permissions.BasePermission):
    """Allows access only to global platform administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.system_role == 'PLATFORM_ADMIN' or request.user.is_superuser)
        )


class WorkspacePermissionHelper:
    """Helper methods to retrieve membership and verify roles for a request and business."""

    @staticmethod
    def get_membership(user, business_id):
        if not user or not user.is_authenticated or not business_id:
            return None
        return BusinessMembership.objects.filter(
            business_id=business_id,
            user=user,
            is_active=True
        ).first()

    @staticmethod
    def is_owner_or_manager(user, business_id):
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'system_role', None) == 'PLATFORM_ADMIN':
            return True
        membership = WorkspacePermissionHelper.get_membership(user, business_id)
        if not membership:
            return False
        return membership.role in [
            BusinessMembership.Role.OWNER,
            BusinessMembership.Role.COMPLIANCE_MANAGER
        ]

    @staticmethod
    def is_workspace_member(user, business_id):
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'system_role', None) == 'PLATFORM_ADMIN':
            return True
        return BusinessMembership.objects.filter(
            business_id=business_id,
            user=user,
            is_active=True
        ).exists()


class HasWorkspaceAccess(permissions.BasePermission):
    """
    Checks that the requesting user is an active member of the business workspace
    specified in query parameter `?business_id=` or in the URL lookup.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, 'system_role', None) == 'PLATFORM_ADMIN':
            return True

        business_id = (
            request.query_params.get('business_id') or
            request.data.get('business_id') or
            view.kwargs.get('business_id') or
            view.kwargs.get('pk')
        )
        if not business_id:
            # If no business_id is passed, allow permission check to defer to object permission or view queryset filtering
            return True

        return WorkspacePermissionHelper.is_workspace_member(request.user, business_id)

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'system_role', None) == 'PLATFORM_ADMIN':
            return True

        business_id = getattr(obj, 'business_id', None)
        if hasattr(obj, 'business') and obj.business:
            business_id = obj.business.id
        elif hasattr(obj, 'id') and obj.__class__.__name__ == 'Business':
            business_id = obj.id

        if not business_id:
            return True

        return WorkspacePermissionHelper.is_workspace_member(request.user, business_id)
