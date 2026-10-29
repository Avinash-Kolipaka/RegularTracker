import abc
import hashlib
from datetime import date
from django.utils import timezone
from .diff_engine import generate_text_diff
from .models import SourceMonitoringRun, RegulatoryChange
from apps.regulations.models import RegulatoryRequirement, RequirementVersion

class BaseSourceAdapter(abc.ABC):
    """Abstract base class for all pluggable regulatory source monitoring adapters."""

    def __init__(self, source):
        self.source = source

    @abc.abstractmethod
    def fetch_records(self):
        """Fetch raw publications or regulatory entries from external or simulated source."""
        pass

    def run_check(self):
        """
        Executes a monitoring run:
        1. Creates SourceMonitoringRun record.
        2. Fetches records.
        3. Identifies existing documents using stable reference codes.
        4. Detects content changes using SHA-256 hash & diff engine.
        5. Logs results without losing existing data.
        """
        run = SourceMonitoringRun.objects.create(
            source=self.source,
            status=SourceMonitoringRun.Status.RUNNING,
        )

        try:
            records = self.fetch_records()
            items_scanned = len(records)
            changes_detected = 0

            for item in records:
                ref_code = item['reference_code']
                title = item['title']
                text = item['full_text']
                summary = item.get('summary', '')
                source_url = item.get('source_url', self.source.official_url)
                pub_date = item.get('publication_date', date.today())
                new_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()

                req = RegulatoryRequirement.objects.filter(
                    source=self.source,
                    reference_code=ref_code
                ).first()

                if not req:
                    # New requirement discovered
                    diff = generate_text_diff("", text)
                    RegulatoryChange.objects.create(
                        monitoring_run=run,
                        source=self.source,
                        reference_code=ref_code,
                        title=title,
                        change_type=RegulatoryChange.ChangeType.NEW_REQUIREMENT,
                        summary=f"New regulation detected: {title}",
                        previous_text="",
                        new_text=text,
                        diff_payload=diff,
                        previous_hash="",
                        new_hash=new_hash,
                        source_url=source_url,
                        publication_date=pub_date,
                    )
                    changes_detected += 1
                else:
                    # Existing requirement: compare hashes
                    prev_hash = hashlib.sha256((req.full_text or '').encode('utf-8')).hexdigest()
                    if prev_hash != new_hash:
                        diff = generate_text_diff(req.full_text, text)
                        RegulatoryChange.objects.create(
                            monitoring_run=run,
                            source=self.source,
                            requirement=req,
                            reference_code=ref_code,
                            title=title,
                            change_type=RegulatoryChange.ChangeType.MODIFICATION,
                            summary=f"Update detected to {ref_code}: {diff.get('change_summary', 'Content updated')}",
                            previous_text=req.full_text,
                            new_text=text,
                            diff_payload=diff,
                            previous_hash=prev_hash,
                            new_hash=new_hash,
                            source_url=source_url,
                            publication_date=pub_date,
                        )
                        changes_detected += 1

            run.items_scanned = items_scanned
            run.changes_detected = changes_detected
            run.status = (
                SourceMonitoringRun.Status.SUCCESS if changes_detected > 0
                else SourceMonitoringRun.Status.NO_CHANGES
            )
            run.completed_at = timezone.now()
            run.execution_log = f"Scanned {items_scanned} records. Found {changes_detected} updates."
            run.save()

            self.source.last_checked_at = timezone.now()
            self.source.last_success_at = timezone.now()
            self.source.save(update_fields=['last_checked_at', 'last_success_at'])

            return run

        except Exception as exc:
            run.status = SourceMonitoringRun.Status.FAILED
            run.error_message = str(exc)
            run.completed_at = timezone.now()
            run.save()
            raise


class SimulatedDemoAdapter(BaseSourceAdapter):
    """
    Simulation adapter providing predictable, safe demonstration data for development.
    Clearly marks records as sample demo data.
    """

    def fetch_records(self):
        return [
            {
                'reference_code': 'DEMO-OSHA-1910',
                'title': '[DEMO SAMPLE] Workplace Safety & Hazard Communication Standard Amendment',
                'summary': 'Simulated demonstration update reflecting modified chemical safety data sheet requirements.',
                'full_text': (
                    "Section 1. Purpose\n"
                    "This standard ensures all employers classify the hazards of chemicals.\n"
                    "Section 2. Labeling\n"
                    "All primary chemical containers must include GHS pictograms, signal words, and hazard statements.\n"
                    "Section 3. Annual Training Mandate\n"
                    "Staff must complete annual hazard training and digital log reviews by December 31st."
                ),
                'source_url': 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910',
                'publication_date': date.today(),
            },
            {
                'reference_code': 'DEMO-EPA-RCRA',
                'title': '[DEMO SAMPLE] Hazardous Waste Generator Standards Review',
                'summary': 'Simulated rule clarification regarding secondary containment for industrial solvent storage.',
                'full_text': (
                    "40 CFR Part 262 - Hazardous Waste Generator Standards.\n"
                    "Facility generators must document weekly container inspections and retain manifests for 3 years.\n"
                    "Emergency coordination contacts must be updated within 30 days of personnel changes."
                ),
                'source_url': 'https://www.epa.gov/hwgenerators',
                'publication_date': date.today(),
            }
        ]
