from django.urls import path
from .views import NotificationListView, NotificationPreferenceView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
]
