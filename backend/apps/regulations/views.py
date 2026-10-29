from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import (
    RegulationSource,
    RegulatoryRequirement,
    BusinessRequirement,
    ApplicabilityReview,
)
from .serializers import (
    RegulationSourceSerializer,
    RegulatoryRequirementSerializer,
    BusinessRequirementSerializer,
    ApplicabilityReviewSerializer,
)
from .applicability import evaluate_applicability
from apps.businesses.models import Business
from apps.businesses.permissions import WorkspacePermissionHelper
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

class RegulationSourceListView(APIView):
    """List regulatory sources."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sources = RegulationSource.objects.all().order_by('name')
        return Response(RegulationSourceSerializer(sources, many=True).data)


class RegulatoryRequirementListView(APIView):
    """Searchable, filterable regulatory requirements library."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = RegulatoryRequirement.objects.all().select_related('source')
        
        # Keyword search
        q = request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) |
                Q(summary__icontains=q) |
                Q(reference_code__icontains=q) |
                Q(full_text__icontains=q)
            )

        # Filters
        jurisdiction = request.query_params.get('jurisdiction')
        if jurisdiction:
            queryset = queryset.filter(jurisdiction__icontains=jurisdiction)

        verification_status = request.query_params.get('verification_status')
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)

        source_id = request.query_params.get('source_id')
        if source_id:
            queryset = queryset.filter(source_id=source_id)

        industry = request.query_params.get('industry')
        if industry:
            queryset = queryset.filter(industry_categories__icontains=industry)

        serializer = RegulatoryRequirementSerializer(queryset, many=True)
        return Response(serializer.data)


class RegulatoryRequirementDetailView(APIView):
    """Retrieve full details and version history of a specific requirement."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        requirement = get_object_or_404(RegulatoryRequirement.objects.select_related('source'), pk=pk)
        return Response(RegulatoryRequirementSerializer(requirement).data)


class BusinessRequirementListView(APIView):
    """List and filter requirements tracked by a specific business workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = BusinessRequirement.objects.filter(
            business_id=business_id
        ).select_related('requirement', 'requirement__source').order_by('status', 'requirement__reference_code')

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        serializer = BusinessRequirementSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, business_id):
        """Link a specific requirement to business manually."""
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        business = get_object_or_404(Business, pk=business_id)
        requirement_id = request.data.get('requirement_id')
        req = get_object_or_404(RegulatoryRequirement, pk=requirement_id)

        biz_req, created = BusinessRequirement.objects.get_or_create(
            business=business,
            requirement=req,
            defaults={
                'status': request.data.get('status', BusinessRequirement.ApplicabilityStatus.POTENTIALLY_APPLICABLE),
                'match_reasons': ['Manually linked by workspace manager.']
            }
        )
        return Response(BusinessRequirementSerializer(biz_req).data, status=status.HTTP_201_CREATED)


class EvaluateApplicabilityView(APIView):
    """Run rule-based applicability engine against all requirements for a business workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        business = get_object_or_404(Business, pk=business_id)
        requirements = RegulatoryRequirement.objects.all()

        evaluated_count = 0
        matched_count = 0

        for req in requirements:
            eval_result = evaluate_applicability(business, req)
            biz_req, _ = BusinessRequirement.objects.get_or_create(
                business=business,
                requirement=req
            )
            # Update only if not already confirmed manually by human
            if biz_req.status != BusinessRequirement.ApplicabilityStatus.CONFIRMED_APPLICABLE:
                biz_req.status = eval_result['status']
                biz_req.match_reasons = eval_result['reasons']
                biz_req.save()

            evaluated_count += 1
            if eval_result['status'] == 'POTENTIALLY_APPLICABLE':
                matched_count += 1

        log_audit_event(
            action=AuditEvent.Action.REQUIREMENT_REVIEWED,
            description=f"Automated applicability evaluation run for {business.name}: {matched_count} matches identified.",
            actor=request.user,
            business=business,
            entity_type='BusinessRequirement',
            request=request
        )

        return Response({
            'message': 'Applicability evaluation completed.',
            'total_requirements_evaluated': evaluated_count,
            'potentially_applicable_count': matched_count,
            'disclaimer': 'RegulaTrack provides operational tracking assistance and does not provide legal advice.'
        })


class BusinessRequirementReviewView(APIView):
    """Human review decision for a business requirement applicability status."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        biz_req = get_object_or_404(BusinessRequirement, pk=pk, business_id=business_id)
        new_status = request.data.get('status')
        rationale = request.data.get('rationale', '').strip()

        if new_status not in BusinessRequirement.ApplicabilityStatus.values:
            return Response({'error': f"Invalid status: {new_status}"}, status=status.HTTP_400_BAD_REQUEST)

        prev_status = biz_req.status
        biz_req.status = new_status
        biz_req.notes = rationale
        biz_req.save()

        # Create review record
        review = ApplicabilityReview.objects.create(
            business_requirement=biz_req,
            reviewer=request.user,
            previous_status=prev_status,
            new_status=new_status,
            decision_rationale=rationale
        )

        log_audit_event(
            action=AuditEvent.Action.REQUIREMENT_REVIEWED,
            description=f"Requirement {biz_req.requirement.reference_code} review: {prev_status} -> {new_status}",
            actor=request.user,
            business=biz_req.business,
            entity_type='BusinessRequirement',
            entity_id=str(biz_req.id),
            metadata={'rationale': rationale},
            request=request
        )

        return Response({
            'message': 'Applicability status updated.',
            'business_requirement': BusinessRequirementSerializer(biz_req).data,
            'review': ApplicabilityReviewSerializer(review).data
        })
