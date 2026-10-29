from django.urls import path
from .views import ReportExportView

urlpatterns = [
    path('businesses/<uuid:business_id>/export/', ReportExportView.as_view(), name='report-export'),
]
