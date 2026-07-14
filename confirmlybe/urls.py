from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.businesses.urls")),
    path("api/", include("apps.customers.urls")),
    path("api/", include("apps.appointments.urls")),
    path("api-auth/", include("rest_framework.urls")),
]
