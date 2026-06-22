from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Appointment
from .serializers import AppointmentEventSerializer, AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "customer__name", "customer__email"]
    ordering_fields = ["scheduled_at", "created_at", "service_price"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Appointment.objects.filter(business=self.request.user.business).select_related("customer")
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        appointment = self.get_object()
        return Response(AppointmentEventSerializer(appointment.events.all(), many=True).data)

