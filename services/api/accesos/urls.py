from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    UsuarioViewSet,
    AccesoViewSet,
    EquipoViewSet,
    TurnoViewSet,
    NotificacionViewSet,
    MeView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
)

router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuarios")
router.register(r"accesos", AccesoViewSet, basename="accesos")
router.register(r"equipos", EquipoViewSet, basename="equipos")
router.register(r"turnos", TurnoViewSet, basename="turnos")
router.register(r"notificaciones", NotificacionViewSet, basename="notificaciones")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),

    # Password reset OTP
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset/verify/", PasswordResetVerifyView.as_view(), name="password-reset-verify"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]

urlpatterns += router.urls
