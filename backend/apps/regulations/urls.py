from django.urls import path
from .views import (
    RegulationSourceListView,
    RegulatoryRequirementListView,
    RegulatoryRequirementDetailView,
    BusinessRequirementListView,
    EvaluateApplicabilityView,
    BusinessRequirementReviewView,
)

urlpatterns = [
    path('sources/', RegulationSourceListView.as_view(), name='regulation-sources-list'),
    path('requirements/', RegulatoryRequirementListView.as_view(), name='regulatory-requirements-list'),
    path('requirements/<uuid:pk>/', RegulatoryRequirementDetailView.as_view(), name='regulatory-requirement-detail'),
    path('businesses/<uuid:business_id>/requirements/', BusinessRequirementListView.as_view(), name='business-requirements-list'),
    path('businesses/<uuid:business_id>/evaluate/', EvaluateApplicabilityView.as_view(), name='business-evaluate-applicability'),
    path('businesses/<uuid:business_id>/requirements/<uuid:pk>/review/', BusinessRequirementReviewView.as_view(), name='business-requirement-review'),
]
