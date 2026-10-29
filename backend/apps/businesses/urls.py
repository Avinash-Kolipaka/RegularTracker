from django.urls import path
from .views import (
    BusinessListCreateView,
    BusinessDetailView,
    BusinessMembersListView,
    BusinessMemberDetailView,
    WorkspaceInvitationListView,
    WorkspaceInvitationAcceptView,
)

urlpatterns = [
    path('', BusinessListCreateView.as_view(), name='business-list-create'),
    path('<uuid:pk>/', BusinessDetailView.as_view(), name='business-detail'),
    path('<uuid:pk>/members/', BusinessMembersListView.as_view(), name='business-members-list'),
    path('<uuid:business_id>/members/<uuid:member_id>/', BusinessMemberDetailView.as_view(), name='business-member-detail'),
    path('<uuid:business_id>/invitations/', WorkspaceInvitationListView.as_view(), name='business-invitations-list'),
    path('invitations/accept/', WorkspaceInvitationAcceptView.as_view(), name='workspace-invitation-accept'),
]
