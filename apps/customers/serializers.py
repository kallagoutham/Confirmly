from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "no_show_count",
            "cancel_count",
            "completed_count",
            "last_no_show_at",
            "last_cancelled_at",
            "last_appointment_at",
            "preferred_hour",
            "created_at",
        ]
        read_only_fields = [
            "no_show_count",
            "cancel_count",
            "completed_count",
            "last_no_show_at",
            "last_cancelled_at",
            "last_appointment_at",
            "preferred_hour",
            "created_at",
        ]

    def validate_email(self, value):
        business = self.context["request"].user.business
        existing = Customer.objects.filter(business=business, email__iexact=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A customer with this email already exists for this business.")
        return value.lower()
