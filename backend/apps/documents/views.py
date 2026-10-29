import hashlib
import os
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q

from .models import ComplianceDocument, DocumentVersion
from .serializers import ComplianceDocumentSerializer, DocumentVersionSerializer
from apps.businesses.permissions import WorkspacePermissionHelper
from apps.audit.utils import log_audit_event
from apps.audit.models import AuditEvent

ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.csv', '.txt'}
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB

class ComplianceDocumentListUploadView(APIView):
    """List documents in workspace or securely upload a new document."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = ComplianceDocument.objects.filter(
            business_id=business_id,
            is_archived=False
        ).select_related('requirement', 'task', 'uploaded_by')

        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        search = request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search) | Q(original_filename__icontains=search)
            )

        serializer = ComplianceDocumentSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, business_id):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'A file is required for upload.'}, status=status.HTTP_400_BAD_REQUEST)

        # File size check
        if file_obj.size > MAX_UPLOAD_SIZE:
            return Response({'error': 'File size exceeds maximum permitted limit of 25MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extension check
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': f"File extension '{ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate SHA-256 hash
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        title = request.data.get('title', file_obj.name)
        category = request.data.get('category', ComplianceDocument.Category.EVIDENCE)
        description = request.data.get('description', '')
        expiration_date = request.data.get('expiration_date') or None
        requirement_id = request.data.get('requirement_id') or None
        task_id = request.data.get('task_id') or None

        document = ComplianceDocument.objects.create(
            business_id=business_id,
            requirement_id=requirement_id,
            task_id=task_id,
            title=title,
            description=description,
            category=category,
            file=file_obj,
            original_filename=file_obj.name,
            file_size_bytes=file_obj.size,
            mime_type=file_obj.content_type or 'application/octet-stream',
            sha256_hash=file_hash,
            expiration_date=expiration_date,
            uploaded_by=request.user,
        )

        log_audit_event(
            action=AuditEvent.Action.DOCUMENT_UPLOADED,
            description=f"Document '{document.title}' uploaded (Category: {document.category})",
            actor=request.user,
            business_id=business_id,
            entity_type='ComplianceDocument',
            entity_id=str(document.id),
            metadata={'sha256': file_hash, 'file_size': file_obj.size},
            request=request
        )

        return Response(ComplianceDocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class ComplianceDocumentDetailView(APIView):
    """Retrieve, update, or archive a document."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        document = get_object_or_404(
            ComplianceDocument.objects.select_related('requirement', 'task', 'uploaded_by').prefetch_related('versions'),
            pk=pk,
            business_id=business_id
        )
        return Response(ComplianceDocumentSerializer(document).data)

    def patch(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        document = get_object_or_404(ComplianceDocument, pk=pk, business_id=business_id)
        serializer = ComplianceDocumentSerializer(document, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(ComplianceDocumentSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_owner_or_manager(request.user, business_id):
            return Response({'error': 'Only workspace owners or managers can archive/delete documents.'}, status=status.HTTP_403_FORBIDDEN)

        document = get_object_or_404(ComplianceDocument, pk=pk, business_id=business_id)
        document.is_archived = True
        document.save(update_fields=['is_archived', 'updated_at'])

        log_audit_event(
            action=AuditEvent.Action.DOCUMENT_DELETED,
            description=f"Document '{document.title}' archived",
            actor=request.user,
            business_id=business_id,
            entity_type='ComplianceDocument',
            entity_id=str(document.id),
            request=request
        )

        return Response({'message': 'Document safely archived.'}, status=status.HTTP_204_NO_CONTENT)


class ComplianceDocumentDownloadView(APIView):
    """Securely stream private document file content to authorized members."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden. You do not have access to this vault.'}, status=status.HTTP_403_FORBIDDEN)

        document = get_object_or_404(ComplianceDocument, pk=pk, business_id=business_id)
        if not document.file:
            raise Http404("Document file not found.")

        try:
            response = FileResponse(document.file.open('rb'), content_type=document.mime_type)
            response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            return response
        except Exception:
            raise Http404("Unable to read document file.")


class ComplianceDocumentNewVersionView(APIView):
    """Upload a new version for an existing compliance document."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, business_id, pk):
        if not WorkspacePermissionHelper.is_workspace_member(request.user, business_id):
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        document = get_object_or_404(ComplianceDocument, pk=pk, business_id=business_id)
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'File is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Archive old version
        DocumentVersion.objects.create(
            document=document,
            version_number=document.version_number,
            file=document.file,
            file_size_bytes=document.file_size_bytes,
            sha256_hash=document.sha256_hash,
            change_notes=request.data.get('notes', 'Previous version archived.'),
            uploaded_by=document.uploaded_by
        )

        # Hash new file
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        new_hash = hasher.hexdigest()

        # Update document
        document.file = file_obj
        document.original_filename = file_obj.name
        document.file_size_bytes = file_obj.size
        document.mime_type = file_obj.content_type or 'application/octet-stream'
        document.sha256_hash = new_hash
        document.version_number += 1
        document.uploaded_by = request.user
        document.save()

        return Response(ComplianceDocumentSerializer(document).data)
