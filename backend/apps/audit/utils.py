from .models import AuditEvent

def log_audit_event(action, description, actor=None, business=None, business_id=None, entity_type='', entity_id='', metadata=None, request=None):
    """
    Utility function to log an immutable audit event.
    Avoids storing passwords or unnecessary sensitive information.
    """
    if not business and business_id:
        from apps.businesses.models import Business
        business = Business.objects.filter(id=business_id).first()

    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        if not actor and request.user and request.user.is_authenticated:
            actor = request.user

    return AuditEvent.objects.create(
        action=action,
        description=description,
        actor=actor,
        business=business,
        entity_type=entity_type or 'System',
        entity_id=str(entity_id) if entity_id else '',
        ip_address=ip_address,
        metadata=metadata or {}
    )
