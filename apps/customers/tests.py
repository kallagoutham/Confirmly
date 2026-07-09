from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.businesses.models import Business

from .models import Customer


class CustomerAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user_a = user_model.objects.create_user(username="owner-a", password="test-pass")
        self.user_b = user_model.objects.create_user(username="owner-b", password="test-pass")
        self.business_a = Business.objects.create(name="Business A", owner=self.user_a)
        self.business_b = Business.objects.create(name="Business B", owner=self.user_b)
        self.customer_a = Customer.objects.create(business=self.business_a, name="Alice", email="alice@example.com")
        self.customer_b = Customer.objects.create(business=self.business_b, name="Bob", email="bob@example.com")
        self.client.force_authenticate(self.user_a)

    def test_list_is_scoped_to_authenticated_business(self):
        response = self.client.get("/api/customers/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data["results"]], [self.customer_a.id])

    def test_cross_tenant_customer_detail_returns_not_found(self):
        response = self.client.get(f"/api/customers/{self.customer_b.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_uses_authenticated_business_and_ignores_tenant_input(self):
        response = self.client.post(
            "/api/customers/",
            {
                "name": "Casey",
                "email": "CASEY@example.com",
                "phone": "555-0100",
                "business": self.business_b.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.business, self.business_a)
        self.assertEqual(customer.email, "casey@example.com")

    def test_same_email_is_allowed_for_different_businesses(self):
        Customer.objects.create(business=self.business_b, name="Other Alice", email="shared@example.com")

        response = self.client.post("/api/customers/", {"name": "Alice Two", "email": "shared@example.com"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class BusinessRequiredTests(APITestCase):
    def test_authenticated_user_without_business_is_denied_cleanly(self):
        user = get_user_model().objects.create_user(username="no-business", password="test-pass")
        self.client.force_authenticate(user)

        response = self.client.get("/api/customers/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
