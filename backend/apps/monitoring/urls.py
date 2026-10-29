from django.urls import path
from .views import (
    SourceMonitoringRunListView,
    TriggerMonitoringRunView,
    RegulatoryChangeListView,
    RegulatoryChangeReviewView,
)

urlpatterns = [
    path('runs/', SourceMonitoringRunListView.as_view(), name='monitoring-runs-list'),
    path('sources/<uuid:source_id>/trigger/', TriggerMonitoringRunView.as_view(), name='monitoring-trigger-run'),
    path('changes/', RegulatoryChangeListView.as_view(), name='regulatory-changes-list'),
    path('changes/<uuid:pk>/review/', RegulatoryChangeReviewView.as_view(), name='regulatory-change-review'),
]
