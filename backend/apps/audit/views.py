from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from .models import AuditEvent
from .serializers import AuditEventSerializer
from apps.businesses.permissions import WorkspacePermissionHelper

class AuditEventListView(APIView):
    """Retrieve audit activity events for a workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=403)

        queryset = AuditEvent.objects.filter(
            Q(business_id=business_id) | (Q(actor=request.user) & Q(business__isnull=True))
        ).select_related('actor').order_by('-created_at')

        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        search = request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) | Q(entity_type__icontains=search)
            )

        serializer = AuditEventSerializer(queryset[:100], many=True)
        return Response(serializer.data)
