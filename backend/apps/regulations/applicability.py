"""
Deterministic rule-based regulatory applicability engine.
Compares a Business profile against RegulatoryRequirement metadata to produce transparent,
source-backed match explanations.
"""

def evaluate_applicability(business, requirement):
    """
    Evaluates whether a regulatory requirement is potentially applicable to a business.
    Returns:
        {
            'status': str ('POTENTIALLY_APPLICABLE', 'NOT_APPLICABLE', 'NEEDS_REVIEW'),
            'reasons': list of str,
            'confidence': str ('HIGH', 'MEDIUM', 'LOW'),
            'disclaimer': str
        }
    """
    reasons = []
    is_applicable = True
    confidence = 'MEDIUM'

    # Check completeness
    if not business.is_profile_complete and business.completeness_percentage < 50:
        return {
            'status': 'NEEDS_REVIEW',
            'reasons': [
                'Business profile is incomplete. Additional profile details (locations, employee band, activities) are required for confident matching.'
            ],
            'confidence': 'LOW',
            'disclaimer': 'RegulaTrack provides operational tracking assistance and does not provide legal advice.'
        }

    # 1. Jurisdiction Check
    req_jurisdiction = (requirement.jurisdiction or '').strip().lower()
    biz_country = (business.country or '').strip().lower()
    biz_state = (business.state_province or '').strip().lower()
    biz_locations = [loc.strip().lower() for loc in (business.operating_locations or [])]

    if 'federal' in req_jurisdiction or 'us' in req_jurisdiction or 'united states' in req_jurisdiction:
        if 'united states' in biz_country or 'us' in biz_country or 'usa' in biz_country:
            reasons.append(f"Jurisdiction match: Federal rule applies across the United States (Business country: '{business.country}').")
        else:
            is_applicable = False
            reasons.append(f"Jurisdiction mismatch: Requirement is US Federal, but business operates in '{business.country}'.")
    elif req_jurisdiction:
        # State-specific or local requirement
        state_matched = (req_jurisdiction in biz_state) or any(req_jurisdiction in loc for loc in biz_locations)
        if state_matched:
            reasons.append(f"Jurisdiction match: State rule for '{requirement.jurisdiction}' matches operating state '{business.state_province}'.")
        else:
            is_applicable = False
            reasons.append(f"Jurisdiction mismatch: Rule is specific to '{requirement.jurisdiction}', but business primary state is '{business.state_province}'.")

    # 2. Industry Category Check
    req_industries = [ind.strip().lower() for ind in (requirement.industry_categories or [])]
    biz_industry = (business.industry_category or '').strip().lower()

    if not req_industries or any(ind in ['general', 'all', 'all industries', 'horizontal'] for ind in req_industries):
        reasons.append("Industry match: Standard requirement applies across all commercial industries.")
    elif biz_industry in req_industries or any(ind in biz_industry for ind in req_industries):
        reasons.append(f"Industry match: Matched business industry category '{business.industry_category}'.")
    else:
        is_applicable = False
        reasons.append(f"Industry mismatch: Rule specifies [{', '.join(requirement.industry_categories)}], but business is '{business.industry_category}'.")

    # 3. Operational Characteristics and Activities Check
    criteria = requirement.applicability_criteria or {}
    required_activities = [act.strip().lower() for act in criteria.get('activities', [])]
    biz_activities = [act.strip().lower() for act in (business.regulated_activities or [])]

    if required_activities:
        matched_acts = [act for act in required_activities if act in biz_activities]
        if matched_acts:
            reasons.append(f"Activity match: Business performs regulated operations: {', '.join(matched_acts)}.")
            confidence = 'HIGH'
        else:
            is_applicable = False
            reasons.append(f"Operational mismatch: Requirement triggers on [{', '.join(required_activities)}], not recorded in business activities.")

    # 4. Employee Band / Size Threshold
    min_employees = criteria.get('min_employees')
    if min_employees:
        band_max_map = {
            '1-10': 10,
            '11-50': 50,
            '51-200': 200,
            '201-500': 500,
            '501+': 999999,
        }
        biz_max = band_max_map.get(business.employee_count_band, 10)
        if biz_max >= min_employees:
            reasons.append(f"Scale threshold: Applies to organizations with at least {min_employees} staff (Business band: '{business.get_employee_count_band_display()}').")
        else:
            is_applicable = False
            reasons.append(f"Scale exemption: Exempts businesses under {min_employees} employees.")

    status = 'POTENTIALLY_APPLICABLE' if is_applicable else 'NOT_APPLICABLE'

    return {
        'status': status,
        'reasons': reasons,
        'confidence': confidence,
        'disclaimer': 'Automated applicability analysis is an operational tracking suggestion and does not constitute a legal determination of liability.'
    }
