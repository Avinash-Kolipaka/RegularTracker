import uuid
from django.db import models
from django.conf import settings

class RegulationSource(models.Model):
    """Official issuing body or regulatory repository (e.g. OSHA, EPA, FTC, State Depts)."""
    class SourceType(models.TextChoices):
        FEDERAL_AGENCY = 'FEDERAL_AGENCY', 'Federal Agency'
        STATE_DEPARTMENT = 'STATE_DEPARTMENT', 'State Department'
        MUNICIPAL = 'MUNICIPAL', 'Municipal / Local'
        STANDARD_BODY = 'STANDARD_BODY', 'Industry Standard Body'
        SIMULATED = 'SIMULATED', 'Simulated / Demo Feed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=270, unique=True)
    source_type = models.CharField(max_length=50, choices=SourceType.choices, default=SourceType.FEDERAL_AGENCY)
    official_url = models.URLField(max_length=500)
    jurisdiction = models.CharField(max_length=150, default='Federal (US)')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    check_frequency_hours = models.PositiveIntegerField(default=24)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    adapter_name = models.CharField(max_length=100, default='standard_rss', help_text='Identifier of the adapter class in monitoring module')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.jurisdiction})"


class RegulatoryRequirement(models.Model):
    """Specific verifiable regulatory rule, mandate, standard, or compliance requirement."""
    class VerificationStatus(models.TextChoices):
        VERIFIED = 'VERIFIED', 'Verified by Official / Legal Analyst'
        UNVERIFIED = 'UNVERIFIED', 'Unverified / Auto-Ingested'
        COMMUNITY_DRAFT = 'COMMUNITY_DRAFT', 'Community / Partner Draft'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(RegulationSource, on_delete=models.CASCADE, related_name='requirements')
    reference_code = models.CharField(max_length=100, db_index=True, help_text='e.g. 29 CFR 1910.1200 or FTC Act Sec 5')
    title = models.CharField(max_length=350)
    summary = models.TextField(help_text='Plain-language summary of what is required and why')
    full_text = models.TextField(blank=True, help_text='Full official text or statutory excerpt')
    jurisdiction = models.CharField(max_length=150, default='Federal (US)')
    industry_categories = models.JSONField(
        default=list,
        blank=True,
        help_text='List of industries where this applies (e.g. ["Manufacturing", "Healthcare"])'
    )
    official_source_url = models.URLField(max_length=500, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    mandatory_filing_deadline = models.CharField(max_length=200, blank=True, help_text='e.g. Annually by March 1st')
    
    # Verification & Provenance
    verification_status = models.CharField(
        max_length=30,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_requirements'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    version_number = models.PositiveIntegerField(default=1)
    
    # Applicability criteria rules (JSON conditions for rule-based matching)
    applicability_criteria = models.JSONField(
        default=dict,
        blank=True,
        help_text='JSON criteria such as {"min_employees": 10, "states": ["CA", "NY"], "activities": ["chemical_storage"]}'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reference_code', 'title']
        unique_together = ('source', 'reference_code')

    def __str__(self):
        return f"[{self.reference_code}] {self.title}"


class RequirementVersion(models.Model):
    """Historical snapshot of a regulatory requirement when updated."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(RegulatoryRequirement, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=350)
    summary = models.TextField()
    full_text = models.TextField()
    change_summary = models.TextField(blank=True)
    effective_date = models.DateField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('requirement', 'version_number')

    def __str__(self):
        return f"{self.requirement.reference_code} v{self.version_number}"


class BusinessRequirement(models.Model):
    """Link between a business and a regulatory requirement with applicability evaluation."""
    class ApplicabilityStatus(models.TextChoices):
        POTENTIALLY_APPLICABLE = 'POTENTIALLY_APPLICABLE', 'Potentially Applicable'
        CONFIRMED_APPLICABLE = 'CONFIRMED_APPLICABLE', 'Confirmed Applicable'
        NOT_APPLICABLE = 'NOT_APPLICABLE', 'Not Applicable / Exempt'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('businesses.Business', on_delete=models.CASCADE, related_name='business_requirements')
    requirement = models.ForeignKey(RegulatoryRequirement, on_delete=models.CASCADE, related_name='business_links')
    status = models.CharField(
        max_length=35,
        choices=ApplicabilityStatus.choices,
        default=ApplicabilityStatus.POTENTIALLY_APPLICABLE
    )
    match_reasons = models.JSONField(
        default=list,
        blank=True,
        help_text='Explainable reasons why this rule matched business profile'
    )
    is_pinned = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    last_evaluated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('business', 'requirement')
        ordering = ['status', 'requirement__reference_code']

    def __str__(self):
        return f"{self.business.name} - {self.requirement.reference_code} ({self.get_status_display()})"


class ApplicabilityReview(models.Model):
    """Audit record of a human reviewer deciding whether a requirement applies to a business."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_requirement = models.ForeignKey(BusinessRequirement, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applicability_reviews')
    previous_status = models.CharField(max_length=35)
    new_status = models.CharField(max_length=35)
    decision_rationale = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.reviewer.email} on {self.business_requirement.requirement.reference_code}"
