from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from .models import Usuario, Acceso, Equipo, Turno
from .serializers import (
    UsuarioSerializer,
    AccesoSerializer,
    EquipoSerializer,
    EquipoRevisionSerializer,
    TurnoSerializer,
    TurnoIniciarSerializer,
    ValidarDocumentoSerializer,
    RegistrarAccesoDocumentoSerializer,
)
from .permissions import IsAdmin, IsGuarda, IsAprendiz


def obtener_turno_activo(user):
    return (
        Turno.objects.filter(guarda=user, activo=True, fin__isnull=True)
        .order_by("-inicio")
        .first()
    )


# =========================
# /api/me/
# =========================
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "permitido": True,
                "motivo": None,
                "usuario": UsuarioSerializer(request.user).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================
# USUARIOS (ADMIN)
# =========================
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by("id")
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset().order_by("id")

        q = (self.request.query_params.get("q") or "").strip()
        rol = (self.request.query_params.get("rol") or "").strip()
        estado = (self.request.query_params.get("estado") or "").strip()
        sede_principal = (self.request.query_params.get("sede_principal") or "").strip()

        if q:
            qs = qs.filter(
                Q(username__icontains=q)
                | Q(email__icontains=q)
                | Q(documento__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )

        if rol:
            qs = qs.filter(rol=rol)

        if estado:
            qs = qs.filter(estado=estado)

        if sede_principal:
            qs = qs.filter(sede_principal=sede_principal)

        return qs



# =========================
# EQUIPOS
# =========================
class EquipoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated]
    queryset = Equipo.objects.all()

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        if rol == "admin":
            qs = Equipo.objects.all().order_by("-creado_en")
        elif rol == "aprendiz":
            qs = Equipo.objects.filter(propietario=user).order_by("-creado_en")
        else:
            qs = Equipo.objects.none()

        estado = (self.request.query_params.get("estado") or "").strip()
        if estado:
            qs = qs.filter(estado=estado)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(serial__icontains=q)
                | Q(marca__icontains=q)
                | Q(modelo__icontains=q)
                | Q(propietario__username__icontains=q)
                | Q(propietario__documento__icontains=q)
            )

        return qs

    def get_permissions(self):
        if self.action == "create":
            rol = getattr(self.request.user, "rol", None)
            if rol == "admin":
                return [IsAuthenticated(), IsAdmin()]
            return [IsAuthenticated(), IsAprendiz()]

        if self.action in ["update", "partial_update", "destroy", "revisar"]:
            return [IsAuthenticated(), IsAdmin()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        rol = getattr(user, "rol", None)

        if rol == "aprendiz":
            serializer.save(propietario=user)
            return

        propietario = serializer.validated_data.get("propietario", None)
        if not propietario:
            raise ValidationError(
                {"propietario": "Como admin debes enviar el propietario (id del aprendiz)."}
            )

        equipo = serializer.save(propietario=propietario)

        equipo.estado = Equipo.Estado.APROBADO
        equipo.motivo_rechazo = None
        equipo.revisado_por = user
        equipo.revisado_en = timezone.now()
        equipo.save()

    @action(detail=True, methods=["patch"], url_path="revisar")
    def revisar(self, request, pk=None):
        equipo = self.get_object()
        s = EquipoRevisionSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        estado = s.validated_data["estado"]
        motivo = s.validated_data.get("motivo_rechazo")

        equipo.estado = estado
        equipo.motivo_rechazo = motivo if estado == Equipo.Estado.RECHAZADO else None
        equipo.revisado_por = request.user
        equipo.revisado_en = timezone.now()
        equipo.save()

        return Response(EquipoSerializer(equipo).data, status=status.HTTP_200_OK)


# =========================
# TURNOS
# =========================
class TurnoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Turno.objects.all().order_by("-inicio")
    serializer_class = TurnoSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["iniciar", "finalizar", "actual"]:
            return [IsAuthenticated(), IsGuarda()]

        if self.action == "finalizar_admin":
            return [IsAuthenticated(), IsAdmin()]

        rol = getattr(self.request.user, "rol", None)
        if rol == "admin":
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsGuarda()]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        if rol == "admin":
            qs = Turno.objects.all().order_by("-inicio")
        else:
            qs = Turno.objects.filter(guarda=user).order_by("-inicio")

        sede = (self.request.query_params.get("sede") or "").strip()
        if sede:
            qs = qs.filter(sede=sede)

        jornada = (self.request.query_params.get("jornada") or "").strip()
        if jornada:
            qs = qs.filter(jornada=jornada)

        activo = (self.request.query_params.get("activo") or "").strip().lower()
        if activo in ["true", "false"]:
            qs = qs.filter(activo=(activo == "true"))

        return qs

    @action(detail=False, methods=["post"], url_path="iniciar")
    def iniciar(self, request):
        s = TurnoIniciarSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        turno_activo = obtener_turno_activo(request.user)
        if turno_activo:
            return Response(
                {"permitido": False, "motivo": "Ya tienes un turno activo.", "turno": TurnoSerializer(turno_activo).data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        turno = Turno.objects.create(
            guarda=request.user,
            sede=s.validated_data["sede"],
            jornada=s.validated_data["jornada"],
            inicio=timezone.now(),
            activo=True,
        )
        return Response(
            {"permitido": True, "motivo": None, "turno": TurnoSerializer(turno).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="finalizar")
    def finalizar(self, request):
        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response(
                {"permitido": False, "motivo": "No tienes un turno activo.", "turno": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        turno.activo = False
        turno.fin = timezone.now()
        turno.save()
        return Response(
            {"permitido": True, "motivo": None, "turno": TurnoSerializer(turno).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="actual")
    def actual(self, request):
        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response({"activo": False}, status=status.HTTP_200_OK)
        return Response(TurnoSerializer(turno).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="finalizar_admin")
    def finalizar_admin(self, request, pk=None):
        turno = self.get_object()

        if not turno.activo:
            return Response(
                {"permitido": False, "motivo": "El turno ya estaba finalizado.", "turno": TurnoSerializer(turno).data},
                status=status.HTTP_400_BAD_REQUEST,
            )

        turno.activo = False
        if not turno.fin:
            turno.fin = timezone.now()
        turno.save(update_fields=["activo", "fin"])

        return Response({"permitido": True, "motivo": None, "turno": TurnoSerializer(turno).data}, status=status.HTTP_200_OK)


# =========================
# ACCESOS
# =========================
class AccesoViewSet(viewsets.ModelViewSet):
    serializer_class = AccesoSerializer
    permission_classes = [IsAuthenticated]
    queryset = Acceso.objects.all()

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        if rol in ["admin", "guarda"]:
            qs = Acceso.objects.all().order_by("-fecha")
        else:
            qs = Acceso.objects.filter(usuario=user).order_by("-fecha")

        tipo = (self.request.query_params.get("tipo") or "").strip()
        if tipo:
            qs = qs.filter(tipo=tipo)

        sede = (self.request.query_params.get("sede") or "").strip()
        if sede:
            qs = qs.filter(sede=sede)

        usuario_id = (self.request.query_params.get("usuario") or "").strip()
        if usuario_id.isdigit():
            qs = qs.filter(usuario_id=int(usuario_id))

        reg_id = (self.request.query_params.get("registrado_por") or "").strip()
        if reg_id.isdigit():
            qs = qs.filter(registrado_por_id=int(reg_id))

        date_from = (self.request.query_params.get("date_from") or "").strip()
        if date_from:
            qs = qs.filter(fecha__date__gte=date_from)

        date_to = (self.request.query_params.get("date_to") or "").strip()
        if date_to:
            qs = qs.filter(fecha__date__lte=date_to)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(usuario__documento__icontains=q) | Q(usuario__username__icontains=q))

        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            rol = getattr(self.request.user, "rol", None)
            if rol == "admin":
                return [IsAuthenticated(), IsAdmin()]
            return [IsAuthenticated(), IsGuarda()]

        if self.action in ["validar_documento", "registrar_por_documento"]:
            return [IsAuthenticated(), IsGuarda()]

        if self.action in ["mis_accesos", "estado"]:
            return [IsAuthenticated(), IsAprendiz()]

        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        request_user = request.user
        rol = getattr(request_user, "rol", None)

        if rol not in ["admin", "guarda"]:
            return Response(
                {"permitido": False, "motivo": "No tienes permisos para registrar accesos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        turno = None
        sede = None

        if rol == "guarda":
            turno = obtener_turno_activo(request_user)
            if not turno:
                return Response(
                    {"permitido": False, "motivo": "Debes iniciar turno antes de registrar accesos."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            sede = turno.sede

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        aprendiz = serializer.validated_data["usuario"]
        tipo = serializer.validated_data["tipo"]
        equipos_enviados = serializer.validated_data.get("equipos", [])

        ultimo = Acceso.objects.filter(usuario=aprendiz).order_by("-fecha").first()

        if ultimo is None and tipo == Acceso.Tipo.SALIDA:
            return Response({"permitido": False, "motivo": "Salida sin ingreso previo."}, status=status.HTTP_400_BAD_REQUEST)

        if ultimo is not None and ultimo.tipo == tipo:
            return Response({"permitido": False, "motivo": f"Doble {tipo}."}, status=status.HTTP_400_BAD_REQUEST)

        equipos_a_setear = []
        if tipo == Acceso.Tipo.SALIDA:
            if not ultimo or ultimo.tipo != Acceso.Tipo.INGRESO:
                return Response(
                    {"permitido": False, "motivo": "Salida inválida: el último registro no es un ingreso."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # heredar sede/turno del ingreso anterior (admin)
            sede = ultimo.sede
            turno = ultimo.turno

            equipos_ingreso_ids = list(ultimo.equipos.values_list("id", flat=True))

            if equipos_enviados:
                enviados_ids = sorted([e.id for e in equipos_enviados])
                if sorted(equipos_ingreso_ids) != enviados_ids:
                    return Response(
                        {"permitido": False, "motivo": "Los equipos en la salida deben coincidir exactamente con los del último ingreso."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                equipos_a_setear = equipos_enviados
            else:
                equipos_a_setear = list(Equipo.objects.filter(id__in=equipos_ingreso_ids))

        acceso = serializer.save(registrado_por=request_user, turno=turno, sede=sede)

        if tipo == Acceso.Tipo.INGRESO and equipos_enviados:
            for eq in equipos_enviados:
                if eq.propietario_id != acceso.usuario_id:
                    raise ValidationError({"equipos": "Uno de los equipos no pertenece al aprendiz."})
                if eq.estado != Equipo.Estado.APROBADO:
                    raise ValidationError({"equipos": "Uno de los equipos no está aprobado."})
            acceso.equipos.set(equipos_enviados)

        if tipo == Acceso.Tipo.SALIDA and equipos_a_setear:
            for eq in equipos_a_setear:
                if eq.propietario_id != acceso.usuario_id:
                    raise ValidationError({"equipos": "Uno de los equipos no pertenece al aprendiz."})
                if eq.estado != Equipo.Estado.APROBADO:
                    raise ValidationError({"equipos": "Uno de los equipos no está aprobado."})
            acceso.equipos.set(equipos_a_setear)

        return Response({"permitido": True, "motivo": None, "acceso": AccesoSerializer(acceso).data}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="validar_documento")
    def validar_documento(self, request):
        s = ValidarDocumentoSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        documento = s.validated_data["documento"]

        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response({"permitido": False, "motivo": "Debes iniciar turno para validar y registrar accesos."},
                            status=status.HTTP_400_BAD_REQUEST)

        aprendiz = Usuario.objects.filter(documento=documento).first()
        if not aprendiz:
            return Response({"permitido": False, "motivo": "Documento no registrado."}, status=status.HTTP_404_NOT_FOUND)

        if getattr(aprendiz, "rol", None) != Usuario.Rol.APRENDIZ:
            return Response({"permitido": False, "motivo": "El documento no pertenece a un aprendiz."}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(aprendiz, "estado", None) == Usuario.Estado.BLOQUEADO:
            return Response({"permitido": False, "motivo": "Aprendiz bloqueado."}, status=status.HTTP_403_FORBIDDEN)

        equipos = Equipo.objects.filter(propietario=aprendiz, estado=Equipo.Estado.APROBADO).order_by("id")

        return Response(
            {
                "permitido": True,
                "aprendiz": {
                    "id": aprendiz.id,
                    "username": aprendiz.username,
                    "first_name": aprendiz.first_name,
                    "last_name": aprendiz.last_name,
                    "documento": aprendiz.documento,
                },
                "equipos_aprobados": [{"id": e.id, "serial": e.serial, "marca": e.marca, "modelo": e.modelo} for e in equipos],
                "turno": {"id": turno.id, "sede": turno.sede, "jornada": turno.jornada},
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="registrar_por_documento")
    def registrar_por_documento(self, request):
        s = RegistrarAccesoDocumentoSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        documento = s.validated_data["documento"]
        tipo = s.validated_data["tipo"]
        equipos_ids = s.validated_data.get("equipos", [])

        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response({"permitido": False, "motivo": "Debes iniciar turno antes de registrar accesos."},
                            status=status.HTTP_400_BAD_REQUEST)

        aprendiz = Usuario.objects.filter(documento=documento).first()
        if not aprendiz:
            return Response({"permitido": False, "motivo": "Documento no registrado."}, status=status.HTTP_404_NOT_FOUND)

        if aprendiz.rol != Usuario.Rol.APRENDIZ:
            return Response({"permitido": False, "motivo": "El documento no pertenece a un aprendiz."}, status=status.HTTP_400_BAD_REQUEST)

        if aprendiz.estado == Usuario.Estado.BLOQUEADO:
            return Response({"permitido": False, "motivo": "Aprendiz bloqueado."}, status=status.HTTP_403_FORBIDDEN)

        ultimo = Acceso.objects.filter(usuario=aprendiz).order_by("-fecha").first()

        if ultimo is None and tipo == Acceso.Tipo.SALIDA:
            return Response({"permitido": False, "motivo": "Salida sin ingreso previo."}, status=status.HTTP_400_BAD_REQUEST)

        if ultimo is not None and ultimo.tipo == tipo:
            return Response({"permitido": False, "motivo": f"Doble {tipo}."}, status=status.HTTP_400_BAD_REQUEST)

        equipos_a_setear = []
        if tipo == Acceso.Tipo.SALIDA:
            if not ultimo or ultimo.tipo != Acceso.Tipo.INGRESO:
                return Response(
                    {"permitido": False, "motivo": "Salida inválida: el último registro no es un ingreso."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            equipos_ingreso_ids = list(ultimo.equipos.values_list("id", flat=True))

            if equipos_ids:
                if sorted(equipos_ingreso_ids) != sorted(equipos_ids):
                    return Response(
                        {"permitido": False, "motivo": "Los equipos en la salida deben coincidir exactamente con los del último ingreso."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                equipos_a_setear = list(Equipo.objects.filter(id__in=equipos_ids))
            else:
                equipos_a_setear = list(Equipo.objects.filter(id__in=equipos_ingreso_ids))

        acceso = Acceso.objects.create(
            usuario=aprendiz,
            tipo=tipo,
            registrado_por=request.user,
            turno=turno,
            sede=turno.sede,
        )

        if tipo == Acceso.Tipo.INGRESO and equipos_ids:
            equipos = list(Equipo.objects.filter(id__in=equipos_ids))
            if len(equipos) != len(set(equipos_ids)):
                return Response({"permitido": False, "motivo": "Alguno de los equipos no existe."}, status=status.HTTP_400_BAD_REQUEST)

            for eq in equipos:
                if eq.propietario_id != aprendiz.id:
                    return Response({"permitido": False, "motivo": "Equipo no pertenece al aprendiz."}, status=status.HTTP_400_BAD_REQUEST)
                if eq.estado != Equipo.Estado.APROBADO:
                    return Response({"permitido": False, "motivo": "Equipo no aprobado."}, status=status.HTTP_400_BAD_REQUEST)

            acceso.equipos.set(equipos)

        if tipo == Acceso.Tipo.SALIDA and equipos_a_setear:
            for eq in equipos_a_setear:
                if eq.propietario_id != aprendiz.id:
                    return Response({"permitido": False, "motivo": "Equipo no pertenece al aprendiz."}, status=status.HTTP_400_BAD_REQUEST)
                if eq.estado != Equipo.Estado.APROBADO:
                    return Response({"permitido": False, "motivo": "Equipo no aprobado."}, status=status.HTTP_400_BAD_REQUEST)
            acceso.equipos.set(equipos_a_setear)

        return Response(
            {
                "permitido": True,
                "motivo": None,
                "acceso": {
                    "id": acceso.id,
                    "fecha": acceso.fecha,
                    "tipo": acceso.tipo,
                    "sede": acceso.sede,
                    "equipos": [{"id": e.id, "serial": e.serial} for e in acceso.equipos.all()],
                },
                "aprendiz": {
                    "id": aprendiz.id,
                    "username": aprendiz.username,
                    "first_name": aprendiz.first_name,
                    "last_name": aprendiz.last_name,
                    "documento": aprendiz.documento,
                },
                "turno": {"id": turno.id, "sede": turno.sede, "jornada": turno.jornada},
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="mis_accesos")
    def mis_accesos(self, request):
        qs = Acceso.objects.filter(usuario=request.user).order_by("-fecha")
        return Response(AccesoSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="estado")
    def estado(self, request):
        ultimo = Acceso.objects.filter(usuario=request.user).order_by("-fecha").first()
        if not ultimo:
            return Response({"estado": "SIN_REGISTROS", "ultimo_tipo": None, "ultima_fecha": None}, status=status.HTTP_200_OK)
        estado = "DENTRO" if ultimo.tipo == Acceso.Tipo.INGRESO else "FUERA"
        return Response({"estado": estado, "ultimo_tipo": ultimo.tipo, "ultima_fecha": ultimo.fecha}, status=status.HTTP_200_OK)
