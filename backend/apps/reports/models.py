import uuid
from django.db import models
from django.conf import settings

class ReportExport(models.Model):
    """Log of compliance exports and generated registers."""
    class ReportType(models.TextChoices):
        REQUIREMENT_REGISTER = 'REQUIREMENT_REGISTER', 'Applicable Requirements Register'
        DEADLINE_SCHEDULE = 'DEADLINE_SCHEDULE', 'Upcoming Compliance Deadlines'
        TASK_COMPLETION = 'TASK_COMPLETION', 'Task Completion & Status Summary'
        EXPIRING_DOCUMENTS = 'EXPIRING_DOCUMENTS', 'Expiring Licenses & Documents'
        REGULATORY_CHANGES = 'REGULATORY_CHANGES', 'Regulatory Changes & Reviews'
        AUDIT_TRAIL = 'AUDIT_TRAIL', 'Full Activity & Audit Trail'

    class Format(models.TextChoices):
        CSV = 'CSV', 'Comma-Separated Values (CSV)'
        JSON = 'JSON', 'Structured JSON'
        PRINT_VIEW = 'PRINT_VIEW', 'Printable Summary View'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='reports')
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_reports')
    report_type = models.CharField(max_length=35, choices=ReportType.choices)
    format = models.CharField(max_length=15, choices=Format.choices, default=Format.CSV)
    filters_applied = models.JSONField(default=dict, blank=True)
    record_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_report_type_display()} ({self.format}) by {self.generated_by.email}"
