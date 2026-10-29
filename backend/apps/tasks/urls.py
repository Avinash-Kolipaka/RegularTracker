from django.urls import path
from .views import (
    ComplianceTaskListCreateView,
    ComplianceTaskDetailView,
    TaskChecklistCreateToggleView,
    TaskCommentListCreateView,
)

urlpatterns = [
    path('businesses/<uuid:business_id>/', ComplianceTaskListCreateView.as_view(), name='task-list-create'),
    path('businesses/<uuid:business_id>/<uuid:pk>/', ComplianceTaskDetailView.as_view(), name='task-detail'),
    path('businesses/<uuid:business_id>/<uuid:task_id>/checklists/', TaskChecklistCreateToggleView.as_view(), name='task-checklist-create'),
    path('businesses/<uuid:business_id>/<uuid:task_id>/checklists/<uuid:item_id>/', TaskChecklistCreateToggleView.as_view(), name='task-checklist-toggle'),
    path('businesses/<uuid:business_id>/<uuid:task_id>/comments/', TaskCommentListCreateView.as_view(), name='task-comments-list-create'),
]
