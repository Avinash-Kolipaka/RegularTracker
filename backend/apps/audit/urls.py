from django.urls import path
from .views import AuditEventListView

urlpatterns = [
    path('businesses/<uuid:business_id>/', AuditEventListView.as_view(), name='audit-events-list'),
]
