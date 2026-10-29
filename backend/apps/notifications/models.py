import uuid
from django.db import models
from django.conf import settings

class Notification(models.Model):
    """In-app alert and notification delivered to a user."""
    class NotificationType(models.TextChoices):
        DEADLINE_ALERT = 'DEADLINE_ALERT', 'Upcoming / Overdue Deadline'
        TASK_ASSIGNED = 'TASK_ASSIGNED', 'New Task Assigned'
        TASK_STATUS = 'TASK_STATUS', 'Task Status Changed'
        REGULATORY_UPDATE = 'REGULATORY_UPDATE', 'New Regulatory Change Detected'
        DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING', 'Document Expiring Soon'
        INVITATION = 'INVITATION', 'Workspace Invitation'
        SYSTEM = 'SYSTEM', 'System Advisory'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.email}"


class NotificationPreference(models.Model):
    """User delivery preferences for email and in-app alerts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    email_on_task_assignment = models.BooleanField(default=True)
    email_on_deadline_approach = models.BooleanField(default=True)
    email_on_regulatory_update = models.BooleanField(default=True)
    email_on_document_expiry = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"
