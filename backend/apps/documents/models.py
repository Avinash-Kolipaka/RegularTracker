import uuid
import os
from django.db import models
from django.conf import settings

def secure_document_path(instance, filename):
    """Store documents securely using UUID to prevent predictable paths."""
    ext = os.path.splitext(filename)[1].lower()
    return f"vault/{instance.business_id}/{uuid.uuid4()}{ext}"

class ComplianceDocument(models.Model):
    """Secure record of an authorized compliance artifact, license, policy, or evidence file."""
    class Category(models.TextChoices):
        LICENSE_PERMIT = 'LICENSE_PERMIT', 'License / Permit'
        CERTIFICATE = 'CERTIFICATE', 'Certificate of Compliance'
        INSPECTION_RECORD = 'INSPECTION_RECORD', 'Inspection / Audit Record'
        FILING_RECEIPT = 'FILING_RECEIPT', 'Statutory Filing Receipt'
        POLICY = 'POLICY', 'Internal Policy & SOP'
        EVIDENCE = 'EVIDENCE', 'Evidence & Documentation'
        OTHER = 'OTHER', 'Other Artifact'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='documents')
    requirement = models.ForeignKey(
        'regulations.RegulatoryRequirement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_documents'
    )
    task = models.ForeignKey(
        'tasks.ComplianceTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_documents'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=35, choices=Category.choices, default=Category.EVIDENCE)
    
    file = models.FileField(upload_to=secure_document_path)
    original_filename = models.CharField(max_length=255)
    file_size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='application/octet-stream')
    sha256_hash = models.CharField(max_length=64, blank=True)
    
    expiration_date = models.DateField(null=True, blank=True, db_index=True)
    is_archived = models.BooleanField(default=False)
    version_number = models.PositiveIntegerField(default=1)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


class DocumentVersion(models.Model):
    """Archival version history of an updated compliance document."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(ComplianceDocument, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=secure_document_path)
    file_size_bytes = models.BigIntegerField(default=0)
    sha256_hash = models.CharField(max_length=64, blank=True)
    change_notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_document_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('document', 'version_number')

    def __str__(self):
        return f"{self.document.title} v{self.version_number}"
