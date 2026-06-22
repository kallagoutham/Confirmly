from django.db import models


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No Show"

    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="appointments")
    customer = models.ForeignKey("customers.Customer", on_delete=models.CASCADE, related_name="appointments")
    title = models.CharField(max_length=150)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    service_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["business", "scheduled_at"], name="appt_business_scheduled_idx"),
            models.Index(fields=["business", "status", "scheduled_at"], name="appt_business_status_idx"),
        ]
        ordering = ["scheduled_at", "id"]

    def __str__(self):
        return f"{self.title} — {self.customer.name}"


class AppointmentEvent(models.Model):
    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        REMINDER_24H_SENT = "reminder_24h_sent", "24h Reminder Sent"
        REMINDER_2H_SENT = "reminder_2h_sent", "2h Reminder Sent"
        REMINDER_FAILED = "reminder_failed", "Reminder Failed"
        REMINDER_OPENED = "reminder_opened", "Reminder Opened"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No Show"
        RISK_CALCULATED = "risk_calculated", "Risk Calculated"

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    metadata = models.JSONField(default=dict)
    actor_type = models.CharField(max_length=30, default="system")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["appointment", "created_at"], name="event_appointment_created_idx"),
            models.Index(fields=["event_type", "created_at"], name="event_type_created_idx"),
        ]
        ordering = ["created_at", "id"]

