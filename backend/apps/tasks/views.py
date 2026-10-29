from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import ComplianceTask, TaskChecklistItem, TaskComment
from .serializers import (
    ComplianceTaskSerializer,
    TaskChecklistItemSerializer,
    TaskCommentSerializer,
)
from apps.businesses.permissions import WorkspacePermissionHelper
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent
from apps.notifications.models import Notification

class ComplianceTaskListCreateView(APIView):
    """List tasks in a workspace with filtering or create a new compliance task."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = ComplianceTask.objects.filter(business_id=business_id).select_related(
            'requirement', 'assigned_to', 'created_by'
        ).prefetch_related('checklist_items', 'comments')

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        assigned_to_me = request.query_params.get('assigned_to_me')
        if assigned_to_me == 'true':
            queryset = queryset.filter(assigned_to=request.user)

        search = request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        serializer = ComplianceTaskSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['business'] = business_id

        serializer = ComplianceTaskSerializer(data=data)
        if serializer.is_valid():
            task = serializer.save(created_by=request.user)

            log_audit_event(
                action=AuditEvent.Action.TASK_CREATED,
                description=f"Task '{task.title}' created (Priority: {task.priority})",
                actor=request.user,
                business=task.business,
                entity_type='ComplianceTask',
                entity_id=str(task.id),
                request=request
            )

            # Send in-app notification if assigned to another user
            if task.assigned_to and task.assigned_to != request.user:
                Notification.objects.create(
                    recipient=task.assigned_to,
                    business=task.business,
                    title="New Task Assigned",
                    message=f"You have been assigned to task: '{task.title}' (Due: {task.due_date or 'No date'})",
                    notification_type=Notification.NotificationType.TASK_ASSIGNED,
                    action_url=f"/tasks/{task.id}"
                )

            return Response(ComplianceTaskSerializer(task).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ComplianceTaskDetailView(APIView):
    """Retrieve, update, or delete a compliance task."""
    permission_classes = [permissions.IsAuthenticated]

    def get_task(self, business_id, pk, user):
        task = get_object_or_404(
            ComplianceTask.objects.select_related('requirement', 'assigned_to', 'created_by').prefetch_related('checklist_items', 'comments'),
            pk=pk,
            business_id=business_id
        )
        if not WorkspacePermissionHelper.is_workspace_member(user, business_id):
            return None
        return task

    def get(self, request, business_id, pk):
        task = self.get_task(business_id, pk, request.user)
        if not task:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ComplianceTaskSerializer(task).data)

    def patch(self, request, business_id, pk):
        task = self.get_task(business_id, pk, request.user)
        if not task:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        prev_status = task.status
        prev_assignee = task.assigned_to

        serializer = ComplianceTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()

            if updated_task.status == ComplianceTask.Status.COMPLETED and prev_status != ComplianceTask.Status.COMPLETED:
                updated_task.completed_at = timezone.now()
                updated_task.save(update_fields=['completed_at'])

                log_audit_event(
                    action=AuditEvent.Action.TASK_COMPLETED,
                    description=f"Task '{updated_task.title}' marked as completed",
                    actor=request.user,
                    business=updated_task.business,
                    entity_type='ComplianceTask',
                    entity_id=str(updated_task.id),
                    request=request
                )
            else:
                log_audit_event(
                    action=AuditEvent.Action.TASK_UPDATED,
                    description=f"Task '{updated_task.title}' updated (Status: {updated_task.status})",
                    actor=request.user,
                    business=updated_task.business,
                    entity_type='ComplianceTask',
                    entity_id=str(updated_task.id),
                    request=request
                )

            # Notify new assignee if changed
            if updated_task.assigned_to and updated_task.assigned_to != prev_assignee and updated_task.assigned_to != request.user:
                Notification.objects.create(
                    recipient=updated_task.assigned_to,
                    business=updated_task.business,
                    title="Task Assigned to You",
                    message=f"You have been assigned to: '{updated_task.title}'",
                    notification_type=Notification.NotificationType.TASK_ASSIGNED,
                    action_url=f"/tasks/{updated_task.id}"
                )

            return Response(ComplianceTaskSerializer(updated_task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Only owners or managers can delete tasks.'}, status=status.HTTP_403_FORBIDDEN)

        task = self.get_task(business_id, pk, request.user)
        if not task:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        task_title = task.title
        task.delete()

        log_audit_event(
            action=AuditEvent.Action.TASK_UPDATED,
            description=f"Task '{task_title}' deleted",
            actor=request.user,
            business_id=business_id,
            entity_type='ComplianceTask',
            entity_id=str(pk),
            request=request
        )

        return Response({'message': 'Task deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


class TaskChecklistCreateToggleView(APIView):
    """Add a checklist item or toggle completion."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, business_id, task_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        task = get_object_or_404(ComplianceTask, pk=task_id, business_id=business_id)
        title = request.data.get('title')
        if not title:
            return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        item = TaskChecklistItem.objects.create(
            task=task,
            title=title,
            sort_order=task.checklist_items.count() + 1
        )
        return Response(TaskChecklistItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def patch(self, request, business_id, task_id, item_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        item = get_object_or_404(TaskChecklistItem, pk=item_id, task_id=task_id, task__business_id=business_id)
        is_completed = request.data.get('is_completed')
        if is_completed is not None:
            item.is_completed = bool(is_completed)
            item.completed_at = timezone.now() if is_completed else None
            item.completed_by = request.user if is_completed else None
            item.save()
        return Response(TaskChecklistItemSerializer(item).data)


class TaskCommentListCreateView(APIView):
    """List or post comments to a compliance task."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id, task_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        comments = TaskComment.objects.filter(
            task_id=task_id,
            task__business_id=business_id
        ).select_related('author').order_by('created_at')
        return Response(TaskCommentSerializer(comments, many=True).data)

    def post(self, request, business_id, task_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        task = get_object_or_404(ComplianceTask, pk=task_id, business_id=business_id)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = TaskComment.objects.create(
            task=task,
            author=request.user,
            content=content
        )
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
