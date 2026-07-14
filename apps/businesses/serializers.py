from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import Business


class BusinessSignupSerializer(serializers.Serializer):
    business_name = serializers.CharField(max_length=150)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, write_only=True)
    timezone = serializers.CharField(
        max_length=64,
        required=False,
        default="America/New_York",
    )

    def validate_username(self, value):
        user_model = get_user_model()
        if user_model.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if not value:
            return value
        user_model = get_user_model()
        if user_model.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    @transaction.atomic
    def create(self, validated_data):
        user_model = get_user_model()
        user = user_model.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        business = Business.objects.create(
            name=validated_data["business_name"],
            owner=user,
            timezone=validated_data.get("timezone", "America/New_York"),
        )
        return {"user": user, "business": business}

    def to_representation(self, instance):
        user = instance["user"]
        business = instance["business"]
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "business": {
                "id": business.id,
                "name": business.name,
                "timezone": business.timezone,
            },
        }


class BusinessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ["id", "name", "timezone", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        user = self.context["request"].user
        if hasattr(user, "business"):
            raise serializers.ValidationError("This user already has a business account.")
        return attrs

    def create(self, validated_data):
        return Business.objects.create(
            owner=self.context["request"].user,
            **validated_data,
        )


class CurrentUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    businesses = serializers.SerializerMethodField()

    def get_businesses(self, user):
        if not hasattr(user, "business"):
            return []
        business = user.business
        return [
            {
                "id": business.id,
                "name": business.name,
                "timezone": business.timezone,
            }
        ]
