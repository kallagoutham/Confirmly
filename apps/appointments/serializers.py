from django.utils import timezone
from rest_framework import serializers

from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer

from .models import Appointment, AppointmentEvent


class AppointmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentEvent
        fields = ["id", "event_type", "metadata", "actor_type", "created_at"]


class AppointmentSerializer(serializers.ModelSerializer):
    customer_detail = CustomerSerializer(source="customer", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "customer",
            "customer_detail",
            "title",
            "scheduled_at",
            "duration_minutes",
            "service_price",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated and hasattr(request.user, "business"):
            self.fields["customer"].queryset = Customer.objects.filter(business=request.user.business)

    def validate_customer(self, customer):
        business = self.context["request"].user.business
        if customer.business_id != business.id:
            raise serializers.ValidationError("Customer does not belong to your business.")
        return customer

    def validate_scheduled_at(self, value):
        if self.instance is None and value <= timezone.now():
            raise serializers.ValidationError("Appointment time must be in the future.")
        return value

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be greater than zero.")
        return value

    def validate_service_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Service price cannot be negative.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["business"] = request.user.business
        appointment = super().create(validated_data)
        AppointmentEvent.objects.create(
            appointment=appointment,
            event_type=AppointmentEvent.EventType.CREATED,
            actor_type="staff",
            metadata={"staff_user_id": request.user.id},
        )
        return appointment

    def update(self, instance, validated_data):
        changed_fields = [key for key, value in validated_data.items() if getattr(instance, key) != value]
        appointment = super().update(instance, validated_data)
        if changed_fields:
            AppointmentEvent.objects.create(
                appointment=appointment,
                event_type=AppointmentEvent.EventType.UPDATED,
                actor_type="staff",
                metadata={"fields": changed_fields, "staff_user_id": self.context["request"].user.id},
            )
        return appointment
