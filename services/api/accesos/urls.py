from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import UsuarioViewSet, AccesoViewSet, EquipoViewSet, TurnoViewSet, MeView

router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuarios")
router.register(r"accesos", AccesoViewSet, basename="accesos")
router.register(r"equipos", EquipoViewSet, basename="equipos")
router.register(r"turnos", TurnoViewSet, basename="turnos")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
]

urlpatterns += router.urls
