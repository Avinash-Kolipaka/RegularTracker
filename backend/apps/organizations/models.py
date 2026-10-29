import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify

class Organization(models.Model):
    """Parent organization that can manage one or more operating businesses."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'org'
            unique_slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=unique_slug).exclude(id=self.id).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = unique_slug
        super().save(*args, **kwargs)


class OrganizationMembership(models.Model):
    """Associates a User with an Organization with defined role."""
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Organization Owner'
        ADMIN = 'ADMIN', 'Organization Admin'
        MEMBER = 'MEMBER', 'Organization Member'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='org_memberships')
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('organization', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"
