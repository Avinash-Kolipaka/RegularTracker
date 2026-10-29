from datetime import date, timedelta
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import ComplianceDeadline, RenewalRecord, InspectionRecord
from .serializers import (
    ComplianceDeadlineSerializer,
    RenewalRecordSerializer,
    InspectionRecordSerializer,
)
from apps.businesses.models import Business
from apps.businesses.permissions import WorkspacePermissionHelper
from apps.tasks.models import ComplianceTask
from apps.regulations.models import BusinessRequirement, RegulatoryRequirement
from apps.documents.models import ComplianceDocument
from apps.monitoring.models import RegulatoryChange
from apps.audit.models import AuditEvent
from apps.audit.serializers import AuditEventSerializer

class ComplianceDeadlineListCreateView(APIView):
    """List or create deadlines for a workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        today = date.today()
        # Mark overdue deadlines dynamically
        ComplianceDeadline.objects.filter(
            business_id=business_id,
            status=ComplianceDeadline.Status.UPCOMING,
            due_date__lt=today
        ).update(status=ComplianceDeadline.Status.OVERDUE)

        queryset = ComplianceDeadline.objects.filter(
            business_id=business_id
        ).select_related('requirement', 'task', 'assigned_to')

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        serializer = ComplianceDeadlineSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['business'] = business_id
        serializer = ComplianceDeadlineSerializer(data=data)
        if serializer.is_valid():
            deadline = serializer.save()
            return Response(ComplianceDeadlineSerializer(deadline).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ComplianceDeadlineDetailView(APIView):
    """Retrieve, update, or delete a deadline."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        deadline = get_object_or_404(ComplianceDeadline, pk=pk, business_id=business_id)
        serializer = ComplianceDeadlineSerializer(deadline, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            if updated.status == ComplianceDeadline.Status.COMPLETED and not updated.completed_at:
                updated.completed_at = timezone.now()
                updated.save(update_fields=['completed_at'])
            return Response(ComplianceDeadlineSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        deadline = get_object_or_404(ComplianceDeadline, pk=pk, business_id=business_id)
        deadline.delete()
        return Response({'message': 'Deadline removed.'}, status=status.HTTP_204_NO_CONTENT)


class RenewalRecordListCreateView(APIView):
    """List or create permit/license renewal schedules."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        renewals = RenewalRecord.objects.filter(business_id=business_id)
        return Response(RenewalRecordSerializer(renewals, many=True).data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data['business'] = business_id
        serializer = RenewalRecordSerializer(data=data)
        if serializer.is_valid():
            renewal = serializer.save()
            return Response(RenewalRecordSerializer(renewal).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InspectionRecordListCreateView(APIView):
    """List or create inspection records."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        inspections = InspectionRecord.objects.filter(business_id=business_id)
        return Response(InspectionRecordSerializer(inspections, many=True).data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data['business'] = business_id
        serializer = InspectionRecordSerializer(data=data)
        if serializer.is_valid():
            inspection = serializer.save()
            return Response(InspectionRecordSerializer(inspection).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CalendarEventsAggregatedView(APIView):
    """Aggregates deadlines, task due dates, renewals, and inspections into unified calendar items."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        events = []

        # 1. Statutory & Operational Deadlines
        deadlines = ComplianceDeadline.objects.filter(business_id=business_id)
        for d in deadlines:
            events.append({
                'id': f"deadline-{d.id}",
                'title': d.title,
                'date': str(d.due_date),
                'event_type': 'DEADLINE',
                'is_statutory': d.is_official_statutory,
                'status': d.status,
                'priority': 'HIGH' if d.is_official_statutory else 'MEDIUM',
                'description': d.description,
            })

        # 2. Tasks Due
        tasks = ComplianceTask.objects.filter(business_id=business_id, due_date__isnull=False)
        for t in tasks:
            events.append({
                'id': f"task-{t.id}",
                'title': f"Task: {t.title}",
                'date': str(t.due_date),
                'event_type': 'TASK',
                'is_statutory': False,
                'status': t.status,
                'priority': t.priority,
                'description': t.description,
            })

        # 3. Renewals
        renewals = RenewalRecord.objects.filter(business_id=business_id, is_active=True)
        for r in renewals:
            events.append({
                'id': f"renewal-{r.id}",
                'title': f"Renewal: {r.name}",
                'date': str(r.next_renewal_deadline),
                'event_type': 'RENEWAL',
                'is_statutory': True,
                'status': 'UPCOMING' if r.next_renewal_deadline >= date.today() else 'OVERDUE',
                'priority': 'HIGH',
                'description': f"Authority: {r.issuing_authority}",
            })

        # 4. Inspections
        inspections = InspectionRecord.objects.filter(business_id=business_id)
        for ins in inspections:
            events.append({
                'id': f"inspection-{ins.id}",
                'title': f"Inspection: {ins.inspecting_agency}",
                'date': str(ins.scheduled_date),
                'event_type': 'INSPECTION',
                'is_statutory': True,
                'status': ins.outcome,
                'priority': 'CRITICAL',
                'description': f"Inspector: {ins.inspector_name}",
            })

        events.sort(key=lambda x: x['date'])
        return Response(events)


class DashboardMetricsView(APIView):
    """Provides dynamic, real-time database-backed metrics and health scores for the workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        business = get_object_or_404(Business, pk=business_id)
        today = date.today()
        upcoming_window = today + timedelta(days=30)

        # Requirements
        biz_reqs = BusinessRequirement.objects.filter(business=business)
        total_tracked_requirements = biz_reqs.count()
        verified_count = biz_reqs.filter(
            requirement__verification_status=RegulatoryRequirement.VerificationStatus.VERIFIED
        ).count()
        unverified_count = total_tracked_requirements - verified_count

        # Tasks
        all_tasks = ComplianceTask.objects.filter(business=business)
        total_tasks = all_tasks.count()
        completed_tasks = all_tasks.filter(status=ComplianceTask.Status.COMPLETED).count()
        overdue_tasks = all_tasks.filter(
            due_date__lt=today
        ).exclude(status=ComplianceTask.Status.COMPLETED).count()
        assigned_to_me = all_tasks.filter(
            assigned_to=request.user
        ).exclude(status=ComplianceTask.Status.COMPLETED).count()

        # Deadlines
        upcoming_deadlines = ComplianceDeadline.objects.filter(
            business=business,
            due_date__gte=today,
            due_date__lte=upcoming_window,
            status=ComplianceDeadline.Status.UPCOMING
        ).count()

        # Expiring documents
        expiring_docs_count = ComplianceDocument.objects.filter(
            business=business,
            is_archived=False,
            expiration_date__isnull=False,
            expiration_date__lte=upcoming_window,
            expiration_date__gte=today
        ).count()

        # Regulatory changes awaiting review
        pending_changes_count = RegulatoryChange.objects.filter(
            review_status=RegulatoryChange.ReviewStatus.PENDING_REVIEW
        ).count()

        # Task completion trends
        tasks_by_status = dict(
            all_tasks.values('status').annotate(count=Count('status')).values_list('status', 'count')
        )
        task_status_breakdown = [
            {'status': 'To Do', 'count': tasks_by_status.get('TODO', 0)},
            {'status': 'In Progress', 'count': tasks_by_status.get('IN_PROGRESS', 0)},
            {'status': 'Awaiting Review', 'count': tasks_by_status.get('AWAITING_REVIEW', 0)},
            {'status': 'Completed', 'count': tasks_by_status.get('COMPLETED', 0)},
        ]

        # Transparent Compliance Operational Score calculation:
        # Base formula: 
        # (Task completion rate * 40%) + (Profile completeness * 30%) + (Verified req ratio * 30%)
        task_score = (completed_tasks / total_tasks * 40) if total_tasks > 0 else 20
        profile_score = (business.completeness_percentage / 100 * 30)
        req_score = (verified_count / total_tracked_requirements * 30) if total_tracked_requirements > 0 else 20
        health_score = min(100, int(round(task_score + profile_score + req_score)))

        # Recent workspace audit activity
        recent_activity_events = AuditEvent.objects.filter(
            Q(business=business) | Q(actor=request.user)
        ).select_related('actor')[:8]

        return Response({
            'business': {
                'id': business.id,
                'name': business.name,
                'is_profile_complete': business.is_profile_complete,
                'completeness_percentage': business.completeness_percentage,
            },
            'metrics': {
                'total_tracked_requirements': total_tracked_requirements,
                'verified_requirements_count': verified_count,
                'unverified_requirements_count': unverified_count,
                'upcoming_deadlines_count': upcoming_deadlines,
                'overdue_tasks_count': overdue_tasks,
                'assigned_to_me_count': assigned_to_me,
                'expiring_documents_count': expiring_docs_count,
                'pending_regulatory_updates_count': pending_changes_count,
                'compliance_health_score': health_score,
                'score_calculation_notes': 'Operational tracking score = (Task Completion % * 40%) + (Business Profile Completeness % * 30%) + (Verified Requirement Ratio * 30%). This indicator reflects internal workflow progress and is not a legal guarantee of compliance.',
            },
            'task_status_breakdown': task_status_breakdown,
            'recent_activity': [
                {
                    'id': a.id,
                    'action': a.action,
                    'action_display': a.get_action_display(),
                    'description': a.description,
                    'actor_email': a.actor.email if a.actor else 'System',
                    'created_at': a.created_at,
                }
                for a in recent_activity_events
            ]
        })
