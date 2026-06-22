from django.conf import settings
from django.db import models


class Business(models.Model):
    name = models.CharField(max_length=150)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business",
    )
    timezone = models.CharField(max_length=64, default="America/New_York")
    reminder_email_from_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "businesses"

    def __str__(self):
        return self.name

