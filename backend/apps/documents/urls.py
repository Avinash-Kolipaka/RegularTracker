from django.urls import path
from .views import (
    ComplianceDocumentListUploadView,
    ComplianceDocumentDetailView,
    ComplianceDocumentDownloadView,
    ComplianceDocumentNewVersionView,
)

urlpatterns = [
    path('businesses/<uuid:business_id>/', ComplianceDocumentListUploadView.as_view(), name='document-list-upload'),
    path('businesses/<uuid:business_id>/<uuid:pk>/', ComplianceDocumentDetailView.as_view(), name='document-detail'),
    path('businesses/<uuid:business_id>/<uuid:pk>/download/', ComplianceDocumentDownloadView.as_view(), name='document-download'),
    path('businesses/<uuid:business_id>/<uuid:pk>/new-version/', ComplianceDocumentNewVersionView.as_version if hasattr(ComplianceDocumentNewVersionView, 'as_version') else ComplianceDocumentNewVersionView.as_view(), name='document-new-version'),
]
