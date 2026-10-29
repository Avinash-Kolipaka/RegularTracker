import uuid
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.organizations.models import Organization, OrganizationMembership
from apps.businesses.models import Business, BusinessMembership
from apps.regulations.models import (
    RegulationSource,
    RegulatoryRequirement,
    RequirementVersion,
    BusinessRequirement,
)
from apps.tasks.models import ComplianceTask, TaskChecklistItem, TaskComment
from apps.compliance.models import ComplianceDeadline, RenewalRecord, InspectionRecord
from apps.monitoring.models import SourceMonitoringRun, RegulatoryChange
from apps.notifications.models import Notification
from apps.audit.models import AuditEvent

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds realistic, clearly labeled demonstration data for testing and development.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='Password123!',
            help='Default password for seeded development users'
        )

    def handle(self, *args, **options):
        dev_password = options['password']
        self.stdout.write(self.style.NOTICE("Seeding RegulaTrack demonstration database..."))

        # 1. Users
        users_data = [
            {'email': 'admin@regulatrack.local', 'first_name': 'System', 'last_name': 'Admin', 'role': 'PLATFORM_ADMIN'},
            {'email': 'owner@example.com', 'first_name': 'Sarah', 'last_name': 'Jenkins', 'role': 'USER'},
            {'email': 'manager@example.com', 'first_name': 'Alex', 'last_name': 'Rivera', 'role': 'USER'},
            {'email': 'employee@example.com', 'first_name': 'David', 'last_name': 'Chen', 'role': 'USER'},
            {'email': 'consultant@example.com', 'first_name': 'Elena', 'last_name': 'Rostova', 'role': 'USER'},
        ]

        created_users = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                email=u['email'],
                defaults={
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'system_role': u['role'],
                    'is_staff': u['role'] == 'PLATFORM_ADMIN',
                    'is_superuser': u['role'] == 'PLATFORM_ADMIN',
                }
            )
            user.set_password(dev_password)
            user.save()
            created_users[u['email']] = user
            if created:
                self.stdout.write(f"  Created user: {user.email}")

        # 2. Organization
        org, _ = Organization.objects.get_or_create(
            name="Apex Enterprises Group",
            defaults={'description': 'Demonstration multi-entity holding group.'}
        )
        OrganizationMembership.objects.get_or_create(
            organization=org,
            user=created_users['owner@example.com'],
            defaults={'role': OrganizationMembership.Role.OWNER}
        )

        # 3. Businesses
        biz1, _ = Business.objects.get_or_create(
            name="Apex Manufacturing Labs",
            defaults={
                'organization': org,
                'legal_name': 'Apex Manufacturing Labs, Inc.',
                'industry_category': 'Manufacturing',
                'industry_code': '332813',
                'country': 'United States',
                'state_province': 'California',
                'city': 'San Jose',
                'employee_count_band': '11-50',
                'annual_revenue_band': '1M_TO_5M',
                'operating_locations': ['California', 'Nevada'],
                'regulated_activities': ['chemical_storage', 'hazardous_waste', 'heavy_machinery'],
                'registration_identifier': 'CA-CORP-948201',
                'created_by': created_users['owner@example.com'],
            }
        )
        biz1.calculate_completeness()
        biz1.save()

        biz2, _ = Business.objects.get_or_create(
            name="Apex Health Tech",
            defaults={
                'organization': org,
                'legal_name': 'Apex Health Technologies LLC',
                'industry_category': 'Healthcare',
                'country': 'United States',
                'state_province': 'New York',
                'city': 'New York',
                'employee_count_band': '1-10',
                'regulated_activities': ['health_data_hipaa', 'customer_pii'],
                'created_by': created_users['owner@example.com'],
            }
        )
        biz2.calculate_completeness()
        biz2.save()

        # Memberships for Apex Manufacturing
        memberships = [
            (created_users['owner@example.com'], BusinessMembership.Role.OWNER),
            (created_users['manager@example.com'], BusinessMembership.Role.COMPLIANCE_MANAGER),
            (created_users['employee@example.com'], BusinessMembership.Role.EMPLOYEE),
            (created_users['consultant@example.com'], BusinessMembership.Role.CONSULTANT),
        ]
        for usr, role in memberships:
            BusinessMembership.objects.get_or_create(
                business=biz1,
                user=usr,
                defaults={'role': role, 'is_active': True}
            )

        # 4. Regulatory Sources (Clearly labeled as official or simulation)
        src_osha, _ = RegulationSource.objects.get_or_create(
            slug='osha-federal',
            defaults={
                'name': 'OSHA - Occupational Safety and Health Administration',
                'source_type': RegulationSource.SourceType.FEDERAL_AGENCY,
                'official_url': 'https://www.osha.gov/laws-regs',
                'jurisdiction': 'Federal (US)',
                'description': 'Federal agency establishing safe and healthful working conditions.',
                'adapter_name': 'osha_demo_adapter',
            }
        )

        src_epa, _ = RegulationSource.objects.get_or_create(
            slug='epa-federal',
            defaults={
                'name': 'EPA - Environmental Protection Agency',
                'source_type': RegulationSource.SourceType.FEDERAL_AGENCY,
                'official_url': 'https://www.epa.gov/laws-regulations',
                'jurisdiction': 'Federal (US)',
                'description': 'Federal environmental standards governing waste, emissions, and chemicals.',
                'adapter_name': 'epa_demo_adapter',
            }
        )

        src_cal, _ = RegulationSource.objects.get_or_create(
            slug='cal-osha',
            defaults={
                'name': 'Cal/OSHA - State Division of Occupational Safety & Health',
                'source_type': RegulationSource.SourceType.STATE_DEPARTMENT,
                'official_url': 'https://www.dir.ca.gov/dosh/',
                'jurisdiction': 'California',
                'description': 'California-specific worker health and safety regulations.',
                'adapter_name': 'calosha_demo_adapter',
            }
        )

        # 5. Regulatory Requirements (All marked [DEMO SAMPLE] in title)
        req_osha, _ = RegulatoryRequirement.objects.get_or_create(
            source=src_osha,
            reference_code='29-CFR-1910.1200',
            defaults={
                'title': '[DEMO SAMPLE] Hazard Communication Standard (HazCom 2012)',
                'summary': 'Requires chemical manufacturers and employers to classify chemical hazards and provide safety data sheets (SDS) and container warning labels.',
                'full_text': '29 CFR 1910.1200 requires employers to maintain a written hazard communication plan, maintain Safety Data Sheets (SDSs) for all hazardous chemicals present in the workplace, and ensure employees receive documented training upon hire and when new hazards are introduced.',
                'jurisdiction': 'Federal (US)',
                'industry_categories': ['Manufacturing', 'Construction', 'General'],
                'official_source_url': 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200',
                'publication_date': date(2012, 3, 26),
                'effective_date': date(2013, 12, 1),
                'mandatory_filing_deadline': 'Maintained continuously; training records retained for 30 years',
                'verification_status': RegulatoryRequirement.VerificationStatus.VERIFIED,
                'verified_by': created_users['admin@regulatrack.local'],
                'verified_at': timezone.now(),
                'applicability_criteria': {
                    'activities': ['chemical_storage', 'hazardous_waste'],
                    'min_employees': 1,
                }
            }
        )

        req_epa, _ = RegulatoryRequirement.objects.get_or_create(
            source=src_epa,
            reference_code='40-CFR-262',
            defaults={
                'title': '[DEMO SAMPLE] Hazardous Waste Generator Regulatory Standards (RCRA)',
                'summary': 'Establishes handling, on-site accumulation time limits, emergency response plans, and shipping manifest tracking for hazardous waste generators.',
                'full_text': '40 CFR Part 262 governs hazardous waste accumulation. Small quantity generators (SQGs) may accumulate waste for up to 180 days without a permit. Weekly container inspections must be logged.',
                'jurisdiction': 'Federal (US)',
                'industry_categories': ['Manufacturing'],
                'official_source_url': 'https://www.epa.gov/hwgenerators',
                'publication_date': date(2016, 11, 28),
                'effective_date': date(2017, 5, 30),
                'mandatory_filing_deadline': 'Biennial Report due by March 1st of even-numbered years',
                'verification_status': RegulatoryRequirement.VerificationStatus.VERIFIED,
                'verified_by': created_users['admin@regulatrack.local'],
                'verified_at': timezone.now(),
                'applicability_criteria': {
                    'activities': ['hazardous_waste'],
                    'min_employees': 1,
                }
            }
        )

        req_cal, _ = RegulatoryRequirement.objects.get_or_create(
            source=src_cal,
            reference_code='8-CCR-3395',
            defaults={
                'title': '[DEMO SAMPLE] California Heat Illness Prevention Mandate',
                'summary': 'Requires provision of water, shade, rest breaks, and written acclimatization procedures for employees exposed to high indoor and outdoor heat.',
                'full_text': 'Title 8 California Code of Regulations section 3395 requires potable drinking water, shade access when temperatures exceed 80°F, high-heat procedures at 95°F, and employee emergency response training.',
                'jurisdiction': 'California',
                'industry_categories': ['Manufacturing', 'Agriculture', 'Construction'],
                'official_source_url': 'https://www.dir.ca.gov/title8/3395.html',
                'publication_date': date(2015, 5, 1),
                'effective_date': date(2015, 5, 1),
                'mandatory_filing_deadline': 'Annual written plan review before summer season',
                'verification_status': RegulatoryRequirement.VerificationStatus.VERIFIED,
                'verified_by': created_users['admin@regulatrack.local'],
                'verified_at': timezone.now(),
                'applicability_criteria': {
                    'states': ['California'],
                }
            }
        )

        # 6. Business Requirements Links
        br1, _ = BusinessRequirement.objects.get_or_create(
            business=biz1,
            requirement=req_osha,
            defaults={
                'status': BusinessRequirement.ApplicabilityStatus.CONFIRMED_APPLICABLE,
                'match_reasons': [
                    "Jurisdiction match: Federal rule applies across United States.",
                    "Industry match: Business is in Manufacturing sector.",
                    "Activity match: Business stores hazardous chemicals."
                ],
                'notes': 'Confirmed applicable by Alex Rivera during Q1 safety review.'
            }
        )

        br2, _ = BusinessRequirement.objects.get_or_create(
            business=biz1,
            requirement=req_epa,
            defaults={
                'status': BusinessRequirement.ApplicabilityStatus.CONFIRMED_APPLICABLE,
                'match_reasons': [
                    "Jurisdiction match: Federal rule applies across United States.",
                    "Activity match: Business handles regulated waste."
                ],
                'notes': 'EPA generator ID is currently active.'
            }
        )

        br3, _ = BusinessRequirement.objects.get_or_create(
            business=biz1,
            requirement=req_cal,
            defaults={
                'status': BusinessRequirement.ApplicabilityStatus.POTENTIALLY_APPLICABLE,
                'match_reasons': [
                    "Jurisdiction match: Business operates in California."
                ],
                'notes': 'Awaiting formal walkthrough of warehouse thermal controls.'
            }
        )

        # 7. Compliance Tasks
        t1, _ = ComplianceTask.objects.get_or_create(
            business=biz1,
            title='Conduct Annual Safety Data Sheet (SDS) Binder Audit',
            defaults={
                'requirement': req_osha,
                'description': 'Review all stored chemical substances against current digital binder and physical shop-floor binders.',
                'status': ComplianceTask.Status.IN_PROGRESS,
                'priority': ComplianceTask.Priority.HIGH,
                'created_by': created_users['manager@example.com'],
                'assigned_to': created_users['employee@example.com'],
                'due_date': date.today() + timedelta(days=12),
            }
        )
        TaskChecklistItem.objects.get_or_create(task=t1, title='Audit Section 1 to 4 inventory in main warehouse', defaults={'is_completed': True, 'sort_order': 1})
        TaskChecklistItem.objects.get_or_create(task=t1, title='Verify GHS secondary container labels on chemical wash station', defaults={'is_completed': False, 'sort_order': 2})
        TaskChecklistItem.objects.get_or_create(task=t1, title='Publish updated digital SDS PDF to intranet portal', defaults={'is_completed': False, 'sort_order': 3})

        t2, _ = ComplianceTask.objects.get_or_create(
            business=biz1,
            title='Submit EPA Biennial Hazardous Waste Manifest Form',
            defaults={
                'requirement': req_epa,
                'description': 'Compile certified manifest receipts from certified hauler and file through RCRAInfo portal.',
                'status': ComplianceTask.Status.TODO,
                'priority': ComplianceTask.Priority.CRITICAL,
                'created_by': created_users['manager@example.com'],
                'assigned_to': created_users['manager@example.com'],
                'due_date': date.today() + timedelta(days=21),
            }
        )

        t3, _ = ComplianceTask.objects.get_or_create(
            business=biz1,
            title='Deploy Warehouse Cool-Down Shade Area and Water Stations',
            defaults={
                'requirement': req_cal,
                'description': 'Ensure mandatory shade canopy is operational and drinking water temperature is below 60°F.',
                'status': ComplianceTask.Status.COMPLETED,
                'priority': ComplianceTask.Priority.MEDIUM,
                'created_by': created_users['owner@example.com'],
                'assigned_to': created_users['employee@example.com'],
                'due_date': date.today() - timedelta(days=3),
                'completed_at': timezone.now() - timedelta(days=2),
            }
        )

        # 8. Deadlines
        ComplianceDeadline.objects.get_or_create(
            business=biz1,
            title='EPA RCRA Biennial Filing Deadline',
            defaults={
                'requirement': req_epa,
                'task': t2,
                'deadline_type': ComplianceDeadline.DeadlineType.STATUTORY_FILING,
                'due_date': date.today() + timedelta(days=21),
                'is_official_statutory': True,
                'status': ComplianceDeadline.Status.UPCOMING,
                'assigned_to': created_users['manager@example.com'],
            }
        )

        ComplianceDeadline.objects.get_or_create(
            business=biz1,
            title='Cal/OSHA Written Plan Annual Review',
            defaults={
                'requirement': req_cal,
                'deadline_type': ComplianceDeadline.DeadlineType.INTERNAL_RENEWAL,
                'due_date': date.today() + timedelta(days=45),
                'is_official_statutory': False,
                'status': ComplianceDeadline.Status.UPCOMING,
                'assigned_to': created_users['owner@example.com'],
            }
        )

        # 9. Renewals & Inspections
        RenewalRecord.objects.get_or_create(
            business=biz1,
            name='County Hazardous Materials Storage Permit',
            defaults={
                'category': 'Environmental Permit',
                'issuing_authority': 'Santa Clara County Fire Prevention',
                'renewal_cycle': RenewalRecord.Cycle.ANNUAL,
                'current_expiry_date': date.today() + timedelta(days=60),
                'next_renewal_deadline': date.today() + timedelta(days=50),
            }
        )

        InspectionRecord.objects.get_or_create(
            business=biz1,
            inspecting_agency='Bay Area Air Quality Management District (BAAQMD)',
            defaults={
                'inspector_name': 'Officer Raymond Vance',
                'scheduled_date': date.today() + timedelta(days=14),
                'outcome': InspectionRecord.Outcome.PENDING,
                'summary_findings': 'Routine triennial air discharge compliance inspection.',
            }
        )

        # 10. Monitoring Run & Change Record
        run, _ = SourceMonitoringRun.objects.get_or_create(
            source=src_osha,
            status=SourceMonitoringRun.Status.SUCCESS,
            defaults={
                'items_scanned': 14,
                'changes_detected': 1,
                'completed_at': timezone.now() - timedelta(hours=3),
                'execution_log': 'Scanned 14 standards. Discovered 1 pending standard clarification.',
            }
        )

        RegulatoryChange.objects.get_or_create(
            source=src_osha,
            reference_code='29-CFR-1910.1200',
            title='[DEMO SAMPLE] GHS Rev 7 Harmonization Standard Update',
            defaults={
                'monitoring_run': run,
                'requirement': req_osha,
                'change_type': RegulatoryChange.ChangeType.MODIFICATION,
                'summary': 'Proposed update incorporating revised precautionary statements for aerosol propellants.',
                'previous_text': req_osha.full_text,
                'new_text': req_osha.full_text + '\nSection 4. Aerosol Precautionary Statements:\nAll flammable aerosol containers must feature updated category warning pictograms and storage ventilation notes.',
                'diff_payload': {
                    'added_lines': ['Section 4. Aerosol Precautionary Statements:', 'All flammable aerosol containers must feature updated category warning pictograms and storage ventilation notes.'],
                    'removed_lines': [],
                    'change_summary': '2 lines added describing aerosol warning requirements.'
                },
                'source_url': 'https://www.osha.gov/laws-regs/federalregister/2026-demo-update',
                'publication_date': date.today(),
                'review_status': RegulatoryChange.ReviewStatus.PENDING_REVIEW,
            }
        )

        # 11. In-App Notifications
        Notification.objects.get_or_create(
            recipient=created_users['manager@example.com'],
            business=biz1,
            title='Upcoming Statutory Filing Deadline',
            defaults={
                'message': 'EPA RCRA Biennial Filing is due in 21 days. Please review and attach manifest forms.',
                'notification_type': Notification.NotificationType.DEADLINE_ALERT,
                'action_url': '/calendar',
            }
        )

        Notification.objects.get_or_create(
            recipient=created_users['employee@example.com'],
            business=biz1,
            title='Task Assigned to You',
            defaults={
                'message': "You have been assigned to 'Conduct Annual Safety Data Sheet (SDS) Binder Audit'.",
                'notification_type': Notification.NotificationType.TASK_ASSIGNED,
                'action_url': f"/tasks/{t1.id}",
            }
        )

        # 12. Audit Events
        AuditEvent.objects.get_or_create(
            business=biz1,
            action=AuditEvent.Action.WORKSPACE_CREATED,
            description="Workspace 'Apex Manufacturing Labs' initialized with demo records",
            defaults={'actor': created_users['owner@example.com'], 'entity_type': 'Business', 'entity_id': str(biz1.id)}
        )

        self.stdout.write(self.style.SUCCESS("Demo data successfully seeded!"))
        self.stdout.write("Test accounts created:")
        self.stdout.write("  - Admin:       admin@regulatrack.local   / " + dev_password)
        self.stdout.write("  - Owner:       owner@example.com         / " + dev_password)
        self.stdout.write("  - Manager:     manager@example.com       / " + dev_password)
        self.stdout.write("  - Employee:    employee@example.com      / " + dev_password)
        self.stdout.write("  - Consultant:  consultant@example.com    / " + dev_password)
