import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class ComplianceDeadline(models.Model):
    """Critical statutory or operational deadline tracked on the compliance calendar."""
    class DeadlineType(models.TextChoices):
        STATUTORY_FILING = 'STATUTORY_FILING', 'Official Statutory Filing'
        INTERNAL_RENEWAL = 'INTERNAL_RENEWAL', 'Internal License / Permit Renewal'
        AUDIT_INSPECTION = 'AUDIT_INSPECTION', 'Audit / Scheduled Inspection'
        PERIODIC_REVIEW = 'PERIODIC_REVIEW', 'Periodic Policy Review'

    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        COMPLETED = 'COMPLETED', 'Completed'
        OVERDUE = 'OVERDUE', 'Overdue'
        WAIVED = 'WAIVED', 'Waived / Not Required'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='deadlines')
    requirement = models.ForeignKey(
        'regulations.RegulatoryRequirement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deadlines'
    )
    task = models.ForeignKey(
        'tasks.ComplianceTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deadlines'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    deadline_type = models.CharField(max_length=30, choices=DeadlineType.choices, default=DeadlineType.STATUTORY_FILING)
    due_date = models.DateField(db_index=True)
    is_official_statutory = models.BooleanField(
        default=False,
        help_text='True if mandated by law; False if internal operational target'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    reminder_days_before = models.JSONField(
        default=list,
        blank=True,
        help_text='Days before deadline to dispatch notification alerts, e.g. [30, 14, 7, 1]'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_deadlines'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'status']

    def __str__(self):
        statutory_tag = "[STATUTORY] " if self.is_official_statutory else ""
        return f"{statutory_tag}{self.title} (Due: {self.due_date})"

    def mark_completed(self):
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])


class RenewalRecord(models.Model):
    """Recurring registration, permit, or insurance renewal schedule."""
    class Cycle(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        QUARTERLY = 'QUARTERLY', 'Quarterly'
        ANNUAL = 'ANNUAL', 'Annual'
        BIENNIAL = 'BIENNIAL', 'Every 2 Years'
        MULTI_YEAR = 'MULTI_YEAR', 'Multi-Year (3-5 Years)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='renewals')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, default='Operating License')
    issuing_authority = models.CharField(max_length=255, blank=True)
    renewal_cycle = models.CharField(max_length=30, choices=Cycle.choices, default=Cycle.ANNUAL)
    current_expiry_date = models.DateField()
    next_renewal_deadline = models.DateField()
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_renewal_deadline']

    def __str__(self):
        return f"{self.name} - Next: {self.next_renewal_deadline}"


class InspectionRecord(models.Model):
    """Log of scheduled, ongoing, or past regulatory inspections or third-party audits."""
    class Outcome(models.TextChoices):
        PENDING = 'PENDING', 'Pending / Scheduled'
        PASSED = 'PASSED', 'Passed Cleanly'
        PASSED_WITH_CONDITIONS = 'PASSED_WITH_CONDITIONS', 'Passed with Advisory Items'
        VIOLATIONS_FOUND = 'VIOLATIONS_FOUND', 'Violations / Findings Identified'
        CANCELLED = 'CANCELLED', 'Cancelled / Rescheduled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='inspections')
    inspecting_agency = models.CharField(max_length=255)
    inspector_name = models.CharField(max_length=200, blank=True)
    scheduled_date = models.DateField()
    conducted_date = models.DateField(null=True, blank=True)
    outcome = models.CharField(max_length=35, choices=Outcome.choices, default=Outcome.PENDING)
    summary_findings = models.TextField(blank=True)
    corrective_actions_required = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_date']

    def __str__(self):
        return f"{self.inspecting_agency} Inspection ({self.scheduled_date}) [{self.get_outcome_display()}]"
