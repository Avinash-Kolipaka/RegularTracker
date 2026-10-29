from django.urls import path
from .views import (
    ComplianceDeadlineListCreateView,
    ComplianceDeadlineDetailView,
    RenewalRecordListCreateView,
    InspectionRecordListCreateView,
    CalendarEventsAggregatedView,
    DashboardMetricsView,
)

urlpatterns = [
    path('businesses/<uuid:business_id>/dashboard/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
    path('businesses/<uuid:business_id>/calendar/', CalendarEventsAggregatedView.as_view(), name='compliance-calendar'),
    path('businesses/<uuid:business_id>/deadlines/', ComplianceDeadlineListCreateView.as_view(), name='deadlines-list-create'),
    path('businesses/<uuid:business_id>/deadlines/<uuid:pk>/', ComplianceDeadlineDetailView.as_view(), name='deadline-detail'),
    path('businesses/<uuid:business_id>/renewals/', RenewalRecordListCreateView.as_view(), name='renewals-list-create'),
    path('businesses/<uuid:business_id>/inspections/', InspectionRecordListCreateView.as_view(), name='inspections-list-create'),
]
