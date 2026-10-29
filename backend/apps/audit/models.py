import uuid
from django.db import models
from django.conf import settings

class AuditEvent(models.Model):
    """Immutable audit trail entry recording compliance and security events."""
    class Action(models.TextChoices):
        AUTH_LOGIN = 'AUTH_LOGIN', 'User Logged In'
        WORKSPACE_CREATED = 'WORKSPACE_CREATED', 'Workspace Created'
        PROFILE_UPDATED = 'PROFILE_UPDATED', 'Business Profile Updated'
        MEMBER_INVITED = 'MEMBER_INVITED', 'Member Invited'
        MEMBER_REMOVED = 'MEMBER_REMOVED', 'Member Access Revoked'
        ROLE_CHANGED = 'ROLE_CHANGED', 'Member Role Changed'
        REQUIREMENT_REVIEWED = 'REQUIREMENT_REVIEWED', 'Applicability Reviewed'
        TASK_CREATED = 'TASK_CREATED', 'Task Created'
        TASK_UPDATED = 'TASK_UPDATED', 'Task Updated'
        TASK_COMPLETED = 'TASK_COMPLETED', 'Task Completed'
        DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED', 'Document Uploaded'
        DOCUMENT_DELETED = 'DOCUMENT_DELETED', 'Document Archived / Deleted'
        MONITORING_RUN = 'MONITORING_RUN', 'Source Monitoring Run Completed'
        REPORT_GENERATED = 'REPORT_GENERATED', 'Compliance Report Exported'
        OTHER = 'OTHER', 'Other Operational Event'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions'
    )
    action = models.CharField(max_length=40, choices=Action.choices, db_index=True)
    entity_type = models.CharField(max_length=60, help_text='Resource type, e.g. Task, Document, BusinessRequirement')
    entity_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=500)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Non-sensitive event payload details (No passwords or tokens)'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.email if self.actor else "System"
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {actor_name} -> {self.get_action_display()}: {self.description}"
