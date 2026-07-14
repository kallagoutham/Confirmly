from django.urls import path

from .views import BusinessCreateView, BusinessSignupView, CurrentUserView

urlpatterns = [
    path("businesses/", BusinessCreateView.as_view(), name="business-create"),
    path("businesses/signup/", BusinessSignupView.as_view(), name="business-signup"),
    path("businesses/me/", CurrentUserView.as_view(), name="business-current-user"),
]
