from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer

class NotificationListView(APIView):
    """Retrieve in-app notifications for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(recipient=request.user).order_by('-created_at')[:50]
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({
            'unread_count': unread_count,
            'notifications': NotificationSerializer(queryset, many=True).data
        })

    def patch(self, request):
        """Mark notification(s) as read."""
        notification_id = request.data.get('notification_id')
        mark_all = request.data.get('mark_all', False)

        if mark_all:
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
            return Response({'message': 'All notifications marked as read.'})

        if notification_id:
            notif = get_object_or_404(Notification, id=notification_id, recipient=request.user)
            notif.is_read = True
            notif.save(update_fields=['is_read'])
            return Response(NotificationSerializer(notif).data)

        return Response({'error': 'Specify notification_id or mark_all=true.'}, status=status.HTTP_400_BAD_REQUEST)


class NotificationPreferenceView(APIView):
    """Retrieve or update notification delivery preferences."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
