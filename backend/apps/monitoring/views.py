from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import SourceMonitoringRun, RegulatoryChange
from .serializers import SourceMonitoringRunSerializer, RegulatoryChangeSerializer
from .adapters import SimulatedDemoAdapter
from apps.regulations.models import RegulationSource, RegulatoryRequirement, RequirementVersion
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

class SourceMonitoringRunListView(APIView):
    """List monitoring runs."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = SourceMonitoringRun.objects.all().select_related('source').order_by('-started_at')
        source_id = request.query_params.get('source_id')
        if source_id:
            queryset = queryset.filter(source_id=source_id)
        serializer = SourceMonitoringRunSerializer(queryset[:50], many=True)
        return Response(serializer.data)


class TriggerMonitoringRunView(APIView):
    """Manually trigger a monitoring run on a regulatory source."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, source_id):
        source = get_object_or_404(RegulationSource, pk=source_id)
        
        # Instantiate adapter
        adapter = SimulatedDemoAdapter(source)
        run = adapter.run_check()

        log_audit_event(
            action=AuditEvent.Action.MONITORING_RUN,
            description=f"Monitoring run completed for source '{source.name}' ({run.changes_detected} changes detected)",
            actor=request.user,
            entity_type='SourceMonitoringRun',
            entity_id=str(run.id),
            request=request
        )

        return Response(SourceMonitoringRunSerializer(run).data, status=status.HTTP_201_CREATED)


class RegulatoryChangeListView(APIView):
    """List detected regulatory changes awaiting human review."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = RegulatoryChange.objects.all().select_related('source', 'requirement', 'reviewed_by').order_by('-created_at')
        review_status = request.query_params.get('review_status')
        if review_status:
            queryset = queryset.filter(review_status=review_status)

        serializer = RegulatoryChangeSerializer(queryset, many=True)
        return Response(serializer.data)


class RegulatoryChangeReviewView(APIView):
    """Submit human review decision on a detected regulatory change."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        change = get_object_or_404(RegulatoryChange, pk=pk)
        decision = request.data.get('decision') # 'ACCEPTED' or 'DISMISSED'
        notes = request.data.get('notes', '')

        if decision not in [RegulatoryChange.ReviewStatus.ACCEPTED, RegulatoryChange.ReviewStatus.DISMISSED]:
            return Response({'error': "Decision must be 'ACCEPTED' or 'DISMISSED'."}, status=status.HTTP_400_BAD_REQUEST)

        change.review_status = decision
        change.reviewed_by = request.user
        change.reviewed_at = timezone.now()
        change.review_notes = notes
        change.save()

        # If accepted, promote changes to requirement model and archive version
        if decision == RegulatoryChange.ReviewStatus.ACCEPTED:
            req = change.requirement
            if not req:
                # Create requirement
                req = RegulatoryRequirement.objects.create(
                    source=change.source,
                    reference_code=change.reference_code,
                    title=change.title,
                    summary=change.summary,
                    full_text=change.new_text,
                    jurisdiction=change.source.jurisdiction,
                    official_source_url=change.source_url,
                    publication_date=change.publication_date,
                    effective_date=change.effective_date,
                    verification_status=RegulatoryRequirement.VerificationStatus.VERIFIED,
                    verified_by=request.user,
                    verified_at=timezone.now(),
                    version_number=1,
                )
                change.requirement = req
                change.save(update_fields=['requirement'])
            else:
                # Save historical version
                RequirementVersion.objects.create(
                    requirement=req,
                    version_number=req.version_number,
                    title=req.title,
                    summary=req.summary,
                    full_text=req.full_text,
                    change_summary=change.summary,
                    effective_date=req.effective_date,
                    content_hash=change.previous_hash,
                )
                # Apply new version
                req.title = change.title
                req.summary = change.summary
                req.full_text = change.new_text
                req.version_number += 1
                req.last_reviewed_at = timezone.now()
                req.save()

        log_audit_event(
            action=AuditEvent.Action.REQUIREMENT_REVIEWED,
            description=f"Regulatory change '{change.reference_code}' was {decision} by {request.user.email}",
            actor=request.user,
            entity_type='RegulatoryChange',
            entity_id=str(change.id),
            request=request
        )

        return Response(RegulatoryChangeSerializer(change).data)
