import uuid
from django.db import models
from django.conf import settings

class SourceMonitoringRun(models.Model):
    """Tracks each execution of a source adapter checking for regulatory updates."""
    class Status(models.TextChoices):
        RUNNING = 'RUNNING', 'Running'
        SUCCESS = 'SUCCESS', 'Completed - Changes Found'
        NO_CHANGES = 'NO_CHANGES', 'Completed - No Changes'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey('regulations.RegulationSource', on_delete=models.CASCADE, related_name='monitoring_runs')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    items_scanned = models.PositiveIntegerField(default=0)
    changes_detected = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    execution_log = models.TextField(blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.source.name} Run @ {self.started_at.strftime('%Y-%m-%d %H:%M')} [{self.status}]"


class RegulatoryChange(models.Model):
    """Discovered regulatory delta, new publication, or revision waiting for human review."""
    class ChangeType(models.TextChoices):
        NEW_REQUIREMENT = 'NEW_REQUIREMENT', 'New Requirement Discovered'
        MODIFICATION = 'MODIFICATION', 'Existing Requirement Modified'
        REMOVAL = 'REMOVAL', 'Requirement Rescinded / Deprecated'
        DEADLINE_UPDATE = 'DEADLINE_UPDATE', 'Filing Deadline Updated'

    class ReviewStatus(models.TextChoices):
        PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
        ACCEPTED = 'ACCEPTED', 'Accepted & Applied'
        DISMISSED = 'DISMISSED', 'Dismissed / Irrelevant'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    monitoring_run = models.ForeignKey(
        SourceMonitoringRun,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detected_changes'
    )
    source = models.ForeignKey('regulations.RegulationSource', on_delete=models.CASCADE, related_name='changes')
    requirement = models.ForeignKey(
        'regulations.RegulatoryRequirement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='changes'
    )
    reference_code = models.CharField(max_length=100)
    title = models.CharField(max_length=350)
    change_type = models.CharField(max_length=30, choices=ChangeType.choices, default=ChangeType.MODIFICATION)
    summary = models.TextField(help_text='Summary of what changed')
    
    # Meaningful text comparison & diff storage
    previous_text = models.TextField(blank=True)
    new_text = models.TextField(blank=True)
    diff_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text='Structured diff: {"added": [...], "removed": [...], "changed": [...]}'
    )
    
    previous_hash = models.CharField(max_length=64, blank=True)
    new_hash = models.CharField(max_length=64, blank=True)

    source_url = models.URLField(max_length=500, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)

    # Human Review Pipeline
    review_status = models.CharField(max_length=25, choices=ReviewStatus.choices, default=ReviewStatus.PENDING_REVIEW)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_regulatory_changes'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_change_type_display()}] {self.reference_code}: {self.title}"
