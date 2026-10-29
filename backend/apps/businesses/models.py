import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone

class Business(models.Model):
    """Business operating entity and root workspace container."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='businesses'
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=270, unique=True, blank=True)
    legal_name = models.CharField(max_length=255, blank=True)
    dba_name = models.CharField(max_length=255, blank=True)
    
    # Industry & Classification
    industry_category = models.CharField(
        max_length=100,
        default='GENERAL',
        help_text='e.g. Healthcare, Construction, Manufacturing, Retail, Tech'
    )
    industry_code = models.CharField(
        max_length=50,
        blank=True,
        help_text='NAICS or standard industry classification code'
    )

    # Jurisdiction & Physical Operations
    country = models.CharField(max_length=100, default='United States')
    state_province = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=30, blank=True)
    operating_locations = models.JSONField(
        default=list,
        blank=True,
        help_text='List of additional operating states/countries where business operates'
    )

    # Scale & Characteristics
    employee_count_band = models.CharField(
        max_length=50,
        default='1-10',
        choices=[
            ('1-10', '1 - 10 employees'),
            ('11-50', '11 - 50 employees'),
            ('51-200', '51 - 200 employees'),
            ('201-500', '201 - 500 employees'),
            ('501+', '500+ employees'),
        ]
    )
    annual_revenue_band = models.CharField(
        max_length=50,
        default='UNDER_1M',
        choices=[
            ('UNDER_1M', 'Under $1 Million'),
            ('1M_TO_5M', '$1M - $5 Million'),
            ('5M_TO_25M', '$5M - $25 Million'),
            ('25M_PLUS', '$25 Million+'),
        ]
    )

    # Regulated Operations (e.g. collects PII, hazardous chemicals, operates heavy machinery)
    regulated_activities = models.JSONField(
        default=list,
        blank=True,
        help_text='Operational activities relevant for compliance matching'
    )
    
    # Registration & Confidential Details (Non-sensitive summary)
    registration_identifier = models.CharField(
        max_length=100,
        blank=True,
        help_text='State registration or business license number (masked if sensitive)'
    )

    # Profile Completeness
    is_profile_complete = models.BooleanField(default=False)
    completeness_percentage = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_businesses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Businesses'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'biz'
            unique_slug = base_slug
            counter = 1
            while Business.objects.filter(slug=unique_slug).exclude(id=self.id).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = unique_slug
            
        # Calculate completeness percentage
        self.calculate_completeness()
        super().save(*args, **kwargs)

    def calculate_completeness(self):
        fields_to_check = [
            bool(self.name),
            bool(self.legal_name or self.name),
            bool(self.industry_category and self.industry_category != 'GENERAL'),
            bool(self.country),
            bool(self.state_province),
            bool(self.city),
            bool(self.employee_count_band),
            bool(self.regulated_activities),
        ]
        completed = sum(1 for f in fields_to_check if f)
        percentage = int((completed / len(fields_to_check)) * 100)
        self.completeness_percentage = percentage
        self.is_profile_complete = percentage >= 75


class BusinessMembership(models.Model):
    """Defines a user's role and access permissions within a specific business workspace."""
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Business Owner'
        COMPLIANCE_MANAGER = 'COMPLIANCE_MANAGER', 'Compliance Manager'
        EMPLOYEE = 'EMPLOYEE', 'Employee'
        CONSULTANT = 'CONSULTANT', 'Consultant'
        VIEWER = 'VIEWER', 'Read-Only Viewer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='business_memberships')
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.EMPLOYEE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business', 'user')
        ordering = ['role', 'created_at']

    def __str__(self):
        return f"{self.user.email} - {self.business.name} ({self.get_role_display()})"


class WorkspaceInvitation(models.Model):
    """Secure invitation token to invite team members or external consultants."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REVOKED = 'REVOKED', 'Revoked'
        EXPIRED = 'EXPIRED', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=32, choices=BusinessMembership.Role.choices, default=BusinessMembership.Role.EMPLOYEE)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return self.status == self.Status.PENDING and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite for {self.email} to {self.business.name} ({self.role})"
