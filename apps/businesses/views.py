from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .serializers import (
    BusinessCreateSerializer,
    BusinessSignupSerializer,
    CurrentUserSerializer,
)


class BusinessSignupView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = BusinessSignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            serializer.to_representation(instance),
            status=status.HTTP_201_CREATED,
        )


class BusinessCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCreateSerializer


class CurrentUserView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CurrentUserSerializer

    def get_object(self):
        return self.request.user
