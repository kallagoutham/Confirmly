from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.businesses.models import Business
from apps.customers.models import Customer

from .models import Appointment, AppointmentEvent


class AppointmentAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user_a = user_model.objects.create_user(username="owner-a", password="test-pass")
        self.user_b = user_model.objects.create_user(username="owner-b", password="test-pass")
        self.business_a = Business.objects.create(name="Business A", owner=self.user_a)
        self.business_b = Business.objects.create(name="Business B", owner=self.user_b)
        self.customer_a = Customer.objects.create(business=self.business_a, name="Alice", email="alice@example.com")
        self.customer_b = Customer.objects.create(business=self.business_b, name="Bob", email="bob@example.com")
        self.appointment_b = Appointment.objects.create(
            business=self.business_b,
            customer=self.customer_b,
            title="Private booking",
            scheduled_at=timezone.now() + timedelta(days=2),
        )
        self.client.force_authenticate(self.user_a)

    def payload(self, **overrides):
        data = {
            "customer": self.customer_a.id,
            "title": "Consultation",
            "scheduled_at": (timezone.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 45,
            "service_price": "125.00",
        }
        data.update(overrides)
        return data

    def test_create_appointment_creates_immutable_created_event(self):
        response = self.client.post("/api/appointments/", self.payload())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        appointment = Appointment.objects.get(pk=response.data["id"])
        self.assertEqual(appointment.business, self.business_a)
        self.assertEqual(appointment.service_price, Decimal("125.00"))
        event = appointment.events.get()
        self.assertEqual(event.event_type, AppointmentEvent.EventType.CREATED)
        self.assertEqual(event.actor_type, "staff")

    def test_cannot_create_appointment_for_other_business_customer(self):
        response = self.client.post("/api/appointments/", self.payload(customer=self.customer_b.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Appointment.objects.filter(business=self.business_a).exists())

    def test_cross_tenant_appointment_detail_returns_not_found(self):
        response = self.client.get(f"/api/appointments/{self.appointment_b.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_past_appointment_is_rejected_on_creation(self):
        response = self.client.post(
            "/api/appointments/",
            self.payload(scheduled_at=(timezone.now() - timedelta(minutes=1)).isoformat()),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scheduled_at", response.data)

    def test_update_appends_event_with_changed_fields(self):
        create_response = self.client.post("/api/appointments/", self.payload())
        appointment_id = create_response.data["id"]

        response = self.client.patch(f"/api/appointments/{appointment_id}/", {"title": "Updated title"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_event = AppointmentEvent.objects.filter(
            appointment_id=appointment_id, event_type=AppointmentEvent.EventType.UPDATED
        ).get()
        self.assertEqual(updated_event.metadata["fields"], ["title"])

    def test_timeline_is_tenant_scoped(self):
        response = self.client.get(f"/api/appointments/{self.appointment_b.id}/timeline/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
