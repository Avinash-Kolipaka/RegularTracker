import csv
import io
from datetime import datetime
from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.negotiation import DefaultContentNegotiation
from django.shortcuts import get_object_or_404

from .models import ReportExport
from apps.businesses.models import Business
from apps.businesses.permissions import WorkspacePermissionHelper
from apps.regulations.models import BusinessRequirement
from apps.tasks.models import ComplianceTask
from apps.compliance.models import ComplianceDeadline
from apps.documents.models import ComplianceDocument
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

class ExportContentNegotiation(DefaultContentNegotiation):
    """Allows custom export formats (like CSV and printable views) without DRF raising Http404."""
    def filter_renderers(self, renderers, format):
        return renderers

class ReportExportView(APIView):
    """Generates structured CSV or JSON compliance reports with provenance metadata."""
    permission_classes = [permissions.IsAuthenticated]
    content_negotiation_class = ExportContentNegotiation

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=403)

        business = get_object_or_404(Business, pk=business_id)
        report_type = request.query_params.get('type', ReportExport.ReportType.REQUIREMENT_REGISTER)
        fmt = (request.query_params.get('format') or request.query_params.get('export_format') or 'CSV').upper()

        timestamp_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        disclaimer = "DISCLAIMER: RegulaTrack reports are operational tracking aids and do not constitute legal advice or formal statutory compliance certification."

        if report_type == ReportExport.ReportType.REQUIREMENT_REGISTER:
            records = BusinessRequirement.objects.filter(business=business).select_related('requirement', 'requirement__source')
            rows = [
                ['Reference Code', 'Title', 'Jurisdiction', 'Source', 'Applicability Status', 'Effective Date', 'Verification Status']
            ]
            for r in records:
                rows.append([
                    r.requirement.reference_code,
                    r.requirement.title,
                    r.requirement.jurisdiction,
                    r.requirement.source.name,
                    r.get_status_display(),
                    str(r.requirement.effective_date or 'N/A'),
                    r.requirement.get_verification_status_display(),
                ])
            filename = f"{business.slug}-requirements-register.csv"

        elif report_type == ReportExport.ReportType.TASK_COMPLETION:
            records = ComplianceTask.objects.filter(business=business).select_related('requirement', 'assigned_to')
            rows = [
                ['Task Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Completed Date', 'Linked Requirement']
            ]
            for t in records:
                rows.append([
                    t.title,
                    t.get_status_display(),
                    t.get_priority_display(),
                    t.assigned_to.email if t.assigned_to else 'Unassigned',
                    str(t.due_date or 'None'),
                    str(t.completed_at or 'None'),
                    t.requirement.reference_code if t.requirement else 'General',
                ])
            filename = f"{business.slug}-task-summary.csv"

        elif report_type == ReportExport.ReportType.DEADLINE_SCHEDULE:
            records = ComplianceDeadline.objects.filter(business=business).select_related('requirement', 'assigned_to')
            rows = [
                ['Deadline Title', 'Type', 'Due Date', 'Status', 'Is Statutory', 'Assignee']
            ]
            for d in records:
                rows.append([
                    d.title,
                    d.get_deadline_type_display(),
                    str(d.due_date),
                    d.get_status_display(),
                    'YES (Mandatory)' if d.is_official_statutory else 'NO (Internal)',
                    d.assigned_to.email if d.assigned_to else 'Unassigned',
                ])
            filename = f"{business.slug}-deadlines.csv"

        elif report_type == ReportExport.ReportType.EXPIRING_DOCUMENTS:
            records = ComplianceDocument.objects.filter(business=business, is_archived=False)
            rows = [
                ['Document Title', 'Category', 'Expiration Date', 'Original Filename', 'SHA-256 Hash']
            ]
            for doc in records:
                rows.append([
                    doc.title,
                    doc.get_category_display(),
                    str(doc.expiration_date or 'None'),
                    doc.original_filename,
                    doc.sha256_hash,
                ])
            filename = f"{business.slug}-documents-inventory.csv"
        else:
            return Response({'error': f"Unknown report type: {report_type}"}, status=400)

        # Log Report Generation
        ReportExport.objects.create(
            business=business,
            generated_by=request.user,
            report_type=report_type,
            format=fmt,
            record_count=len(rows) - 1
        )

        log_audit_event(
            action=AuditEvent.Action.REPORT_GENERATED,
            description=f"Exported {report_type} ({fmt})",
            actor=request.user,
            business=business,
            entity_type='ReportExport',
            request=request
        )

        if fmt == 'JSON':
            headers = rows[0]
            data_items = [dict(zip(headers, row)) for row in rows[1:]]
            return Response({
                'report_type': report_type,
                'business': business.name,
                'generated_at': timestamp_str,
                'disclaimer': disclaimer,
                'records': data_items
            })

        # CSV format
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([f"RegulaTrack Report: {report_type}"])
        writer.writerow([f"Organization: {business.name} | Generated: {timestamp_str}"])
        writer.writerow([disclaimer])
        writer.writerow([])
        writer.writerows(rows)

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
