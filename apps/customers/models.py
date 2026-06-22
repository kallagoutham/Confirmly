from django.db import models


class Customer(models.Model):
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="customers")
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    no_show_count = models.PositiveIntegerField(default=0)
    cancel_count = models.PositiveIntegerField(default=0)
    completed_count = models.PositiveIntegerField(default=0)
    last_no_show_at = models.DateTimeField(null=True, blank=True)
    last_cancelled_at = models.DateTimeField(null=True, blank=True)
    last_appointment_at = models.DateTimeField(null=True, blank=True)
    preferred_hour = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["business", "email"], name="unique_customer_email_per_business")
        ]
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

