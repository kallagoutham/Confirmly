from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Business


class BusinessSignupTests(APITestCase):
    def test_signup_creates_user_and_business(self):
        response = self.client.post(
            "/api/businesses/signup/",
            {
                "business_name": "Northside Studio",
                "username": "northside",
                "email": "Owner@Example.com",
                "password": "safe-test-pass",
                "timezone": "America/New_York",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="northside")
        business = Business.objects.get(owner=user)
        self.assertEqual(user.email, "owner@example.com")
        self.assertEqual(business.name, "Northside Studio")
        self.assertIn("business", response.data, response.data)
        self.assertEqual(response.data["business"]["id"], business.id)

    def test_signup_rejects_duplicate_username(self):
        get_user_model().objects.create_user(
            username="owner",
            password="safe-test-pass",
        )

        response = self.client.post(
            "/api/businesses/signup/",
            {
                "business_name": "Second Studio",
                "username": "OWNER",
                "password": "safe-test-pass",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_signup_requires_minimum_password_length(self):
        response = self.client.post(
            "/api/businesses/signup/",
            {
                "business_name": "Short Password Studio",
                "username": "short-password",
                "password": "short",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Business.objects.exists())


class BusinessCreateTests(APITestCase):
    def test_authenticated_user_without_business_can_create_business(self):
        user = get_user_model().objects.create_user(
            username="existing-owner",
            password="safe-test-pass",
        )
        self.client.force_authenticate(user)

        response = self.client.post(
            "/api/businesses/",
            {
                "name": "Existing Owner Studio",
                "timezone": "America/Chicago",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        business = Business.objects.get(owner=user)
        self.assertEqual(business.name, "Existing Owner Studio")
        self.assertEqual(response.data["id"], business.id)

    def test_authenticated_user_with_business_cannot_create_second_business(self):
        user = get_user_model().objects.create_user(
            username="existing-business-owner",
            password="safe-test-pass",
        )
        Business.objects.create(name="First Studio", owner=user)
        self.client.force_authenticate(user)

        response = self.client.post(
            "/api/businesses/",
            {
                "name": "Second Studio",
                "timezone": "America/New_York",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CurrentUserTests(APITestCase):
    def test_current_user_lists_owned_business(self):
        user = get_user_model().objects.create_user(
            username="business-owner",
            email="owner@example.com",
            password="safe-test-pass",
        )
        business = Business.objects.create(name="Owner Studio", owner=user)
        self.client.force_authenticate(user)

        response = self.client.get("/api/businesses/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "business-owner")
        self.assertEqual(response.data["businesses"][0]["id"], business.id)

    def test_current_user_without_business_is_allowed_but_has_empty_businesses(self):
        user = get_user_model().objects.create_user(
            username="no-business-owner",
            password="safe-test-pass",
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/businesses/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["businesses"], [])
