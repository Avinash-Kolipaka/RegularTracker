import io
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.businesses.models import Business, BusinessMembership
from apps.tasks.models import ComplianceTask, TaskChecklistItem
from apps.compliance.models import ComplianceDeadline
from apps.documents.models import ComplianceDocument
from apps.audit.models import AuditEvent

User = get_user_model()

@pytest.mark.django_db
class TestComplianceWorkflowAndSecurity:

    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        import uuid
        self.client = APIClient()
        self.user = User.objects.create_user(email=f'lead_{uuid.uuid4().hex[:6]}@example.com', password='Password123!')
        self.business = Business.objects.create(name='Acme BioMed', created_by=self.user)
        self.membership = BusinessMembership.objects.create(
            business=self.business,
            user=self.user,
            role=BusinessMembership.Role.COMPLIANCE_MANAGER
        )
        self.client.force_authenticate(user=self.user)

    def test_task_creation_and_completion_workflow(self):
        # Create task
        res = self.client.post(f'/api/v1/tasks/businesses/{self.business.id}/', {
            'title': 'Inspect Autoclave Sterilization Records',
            'priority': 'HIGH',
            'due_date': '2026-11-15',
        }, format='json')
        assert res.status_code == 201
        task_id = res.data['id']

        # Add checklist item
        chk_res = self.client.post(f'/api/v1/tasks/businesses/{self.business.id}/{task_id}/checklists/', {
            'title': 'Verify temperature chart records'
        }, format='json')
        assert chk_res.status_code == 201
        chk_id = chk_res.data['id']

        # Toggle checklist
        toggle_res = self.client.patch(f'/api/v1/tasks/businesses/{self.business.id}/{task_id}/checklists/{chk_id}/', {
            'is_completed': True
        }, format='json')
        assert toggle_res.status_code == 200
        assert toggle_res.data['is_completed'] is True

        # Complete task
        patch_res = self.client.patch(f'/api/v1/tasks/businesses/{self.business.id}/{task_id}/', {
            'status': 'COMPLETED'
        }, format='json')
        assert patch_res.status_code == 200
        assert patch_res.data['status'] == 'COMPLETED'
        assert patch_res.data['completed_at'] is not None

        # Verify audit log recorded completion
        audit_exists = AuditEvent.objects.filter(
            business=self.business,
            action=AuditEvent.Action.TASK_COMPLETED,
            entity_id=task_id
        ).exists()
        assert audit_exists is True

    def test_document_upload_validation_rejects_disallowed_type(self):
        # Disallowed exe file
        bad_file = SimpleUploadedFile("malicious.exe", b"binarycontent", content_type="application/x-msdownload")
        res = self.client.post(f'/api/v1/documents/businesses/{self.business.id}/', {
            'title': 'Suspicious File',
            'file': bad_file,
        }, format='multipart')
        assert res.status_code == 400
        assert 'not permitted' in res.data['error']

    def test_document_upload_success_valid_pdf(self):
        valid_pdf = SimpleUploadedFile("policy.pdf", b"%PDF-1.4 sample pdf content", content_type="application/pdf")
        res = self.client.post(f'/api/v1/documents/businesses/{self.business.id}/', {
            'title': 'Environmental SOP',
            'category': 'POLICY',
            'file': valid_pdf,
        }, format='multipart')
        assert res.status_code == 201
        assert res.data['title'] == 'Environmental SOP'
        assert res.data['sha256_hash'] != ''

    def test_dashboard_metrics_dynamic_calculation(self):
        res = self.client.get(f'/api/v1/compliance/businesses/{self.business.id}/dashboard/')
        assert res.status_code == 200
        assert 'metrics' in res.data
        assert 'compliance_health_score' in res.data['metrics']
        assert 'recent_activity' in res.data
        assert 'task_status_breakdown' in res.data

    def test_report_export_csv_download(self):
        url = f'/api/v1/reports/businesses/{self.business.id}/export/?type=REQUIREMENT_REGISTER&format=CSV'
        res = self.client.get(url)
        print("URL:", url)
        print("STATUS:", res.status_code)
        print("CONTENT:", res.content)
        assert res.status_code == 200
        assert res['Content-Type'] == 'text/csv'
        assert 'attachment;' in res['Content-Disposition']
