import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.businesses.models import Business, BusinessMembership
from apps.regulations.models import RegulationSource, RegulatoryRequirement, BusinessRequirement
from apps.regulations.applicability import evaluate_applicability

User = get_user_model()

@pytest.mark.django_db
class TestAuthenticationAndWorkspaces:

    def setup_method(self):
        self.client = APIClient()

    def test_user_registration_and_login(self):
        reg_payload = {
            'email': 'newuser@example.com',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        res = self.client.post('/api/v1/auth/register/', reg_payload, format='json')
        assert res.status_code == 201
        assert 'tokens' in res.data
        assert res.data['user']['email'] == 'newuser@example.com'

        # Test login
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'newuser@example.com',
            'password': 'StrongPassword123!',
        }, format='json')
        assert login_res.status_code == 200
        assert 'access' in login_res.data

    def test_workspace_creation_assigns_owner(self):
        user = User.objects.create_user(email='owner_test@example.com', password='Password123!')
        self.client.force_authenticate(user=user)

        res = self.client.post('/api/v1/businesses/', {
            'name': 'Starlight BioTech',
            'industry_category': 'Healthcare',
            'country': 'United States',
            'state_province': 'Massachusetts',
        }, format='json')
        assert res.status_code == 201
        biz_id = res.data['id']

        # Verify membership
        membership = BusinessMembership.objects.get(business_id=biz_id, user=user)
        assert membership.role == BusinessMembership.Role.OWNER
        assert membership.is_active is True

    def test_cross_workspace_isolation(self):
        user1 = User.objects.create_user(email='user1@example.com', password='Password123!')
        user2 = User.objects.create_user(email='user2@example.com', password='Password123!')

        biz1 = Business.objects.create(name='Company Alpha', created_by=user1)
        BusinessMembership.objects.create(business=biz1, user=user1, role=BusinessMembership.Role.OWNER)

        biz2 = Business.objects.create(name='Company Beta', created_by=user2)
        BusinessMembership.objects.create(business=biz2, user=user2, role=BusinessMembership.Role.OWNER)

        # Authenticate as user2 and attempt to read Company Alpha's private workspace
        self.client.force_authenticate(user=user2)
        res = self.client.get(f'/api/v1/businesses/{biz1.id}/')
        assert res.status_code == 403

    def test_applicability_evaluation_logic(self):
        user = User.objects.create_user(email='eval_user@example.com', password='Password123!')
        biz = Business.objects.create(
            name='Precision Chemicals',
            industry_category='Manufacturing',
            country='United States',
            state_province='California',
            employee_count_band='11-50',
            regulated_activities=['chemical_storage'],
            is_profile_complete=True,
            completeness_percentage=90,
            created_by=user
        )

        source = RegulationSource.objects.create(
            name='Test OSHA',
            slug='test-osha',
            official_url='https://example.com'
        )
        req = RegulatoryRequirement.objects.create(
            source=source,
            reference_code='TEST-HAZ-01',
            title='Test Hazard Standards',
            summary='Test summary',
            jurisdiction='Federal (US)',
            industry_categories=['Manufacturing'],
            applicability_criteria={'activities': ['chemical_storage']}
        )

        result = evaluate_applicability(biz, req)
        assert result['status'] == 'POTENTIALLY_APPLICABLE'
        assert any('Manufacturing' in r for r in result['reasons'])
        assert any('chemical_storage' in r for r in result['reasons'])
