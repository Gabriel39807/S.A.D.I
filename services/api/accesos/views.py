import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Acceso, Equipo, Notificacion, PasswordResetOTP, Turno, Usuario
from .permissions import IsAdmin, IsAprendiz, IsGuarda
from .serializers import (
    AccesoSerializer,
    EquipoRevisionSerializer,
    EquipoSerializer,
    NotificacionSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    RegistrarAccesoDocumentoSerializer,
    TurnoIniciarSerializer,
    TurnoSerializer,
    UsuarioSerializer,
    ValidarDocumentoSerializer,
)

# =========================
# Helpers
# =========================
def obtener_turno_activo(user):
    return (
        Turno.objects.filter(guarda=user, activo=True, fin__isnull=True)
        .order_by("-inicio")
        .first()
    )


# --- Helpers OTP ---
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def _hash_code(salt: str, code: str) -> str:
    raw = f"{salt}:{code}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _generate_otp_code() -> str:
    # 6 dígitos
    return f"{secrets.randbelow(10**6):06d}"


def _send_password_reset_email(to_email: str, code: str):
    """
    Envía OTP por correo. Si no hay template HTML, cae a texto.
    """
    subject = "SADI — Código de recuperación"
    context = {"otp": code, "ttl_minutes": OTP_TTL_MINUTES, "email": to_email}

    text_body = (
        f"Tu código de recuperación SADI es: {code}\n\n"
        f"Este código vence en {OTP_TTL_MINUTES} minutos.\n"
        "Si no solicitaste este cambio, ignora este mensaje."
    )

    html_body = None
    try:
        html_body = render_to_string("emails/password_reset_otp.html", context)
    except Exception:
        html_body = None

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@sadi.local"),
        to=[to_email],
    )
    if html_body:
        msg.attach_alternative(html_body, "text/html")
    # Si tu SMTP no está configurado, esto puede fallar. En dev usa console backend.
    msg.send(fail_silently=False)


# =========================
# /api/me/
# =========================
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"permitido": True, "motivo": None, "usuario": UsuarioSerializer(request.user).data},
            status=status.HTTP_200_OK,
        )


# =========================
# AUTH: PASSWORD RESET (OTP)
# =========================
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        try:
            s.is_valid(raise_exception=True)
        except ValidationError as e:
            return Response(
                {"permitido": False, "motivo": "Datos inválidos.", "errores": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = s.validated_data["email"]
        user = Usuario.objects.filter(email__iexact=email).first()

        # Respuesta neutral para no filtrar si existe el email
        if user:
            code = _generate_otp_code()
            salt = secrets.token_hex(16)
            code_hash = _hash_code(salt, code)
            expires_at = timezone.now() + timedelta(minutes=OTP_TTL_MINUTES)

            PasswordResetOTP.objects.create(
                user=user,
                salt=salt,
                code_hash=code_hash,
                expires_at=expires_at,
            )

            _send_password_reset_email(user.email, code)

        return Response(
            {"permitido": True, "motivo": None, "mensaje": "Si el correo existe, enviamos un código OTP."},
            status=status.HTTP_200_OK,
        )


class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetVerifySerializer(data=request.data)
        try:
            s.is_valid(raise_exception=True)
        except ValidationError as e:
            return Response(
                {"permitido": False, "motivo": "Datos inválidos.", "errores": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = s.validated_data["email"]
        otp = s.validated_data["otp"]

        user = Usuario.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"permitido": False, "motivo": "OTP inválido."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = (
            PasswordResetOTP.objects.filter(user=user, used_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if not otp_obj:
            return Response({"permitido": False, "motivo": "No hay OTP activo."}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > otp_obj.expires_at:
            return Response({"permitido": False, "motivo": "OTP expirado."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.attempts >= OTP_MAX_ATTEMPTS:
            return Response({"permitido": False, "motivo": "Demasiados intentos."}, status=status.HTTP_400_BAD_REQUEST)

        if _hash_code(otp_obj.salt, otp) != otp_obj.code_hash:
            otp_obj.attempts += 1
            otp_obj.save(update_fields=["attempts"])
            return Response({"permitido": False, "motivo": "OTP inválido."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"permitido": True, "motivo": None}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        try:
            s.is_valid(raise_exception=True)
        except ValidationError as e:
            return Response(
                {"permitido": False, "motivo": "Datos inválidos.", "errores": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = s.validated_data["email"]
        otp = s.validated_data["otp"]
        new_password = s.validated_data["new_password"]

        user = Usuario.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"permitido": False, "motivo": "OTP inválido."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = (
            PasswordResetOTP.objects.filter(user=user, used_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if not otp_obj:
            return Response({"permitido": False, "motivo": "No hay OTP activo."}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > otp_obj.expires_at:
            return Response({"permitido": False, "motivo": "OTP expirado."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.attempts >= OTP_MAX_ATTEMPTS:
            return Response({"permitido": False, "motivo": "Demasiados intentos."}, status=status.HTTP_400_BAD_REQUEST)

        if _hash_code(otp_obj.salt, otp) != otp_obj.code_hash:
            otp_obj.attempts += 1
            otp_obj.save(update_fields=["attempts"])
            return Response({"permitido": False, "motivo": "OTP inválido."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        otp_obj.used_at = timezone.now()
        otp_obj.save(update_fields=["used_at"])

        return Response({"permitido": True, "motivo": None}, status=status.HTTP_200_OK)


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
# NOTIFICACIONES
# =========================
class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    queryset = Notificacion.objects.all()

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        qs_user = Notificacion.objects.filter(user=user)
        qs_rol = Notificacion.objects.filter(user__isnull=True, rol_objetivo=rol)
        qs_global = Notificacion.objects.filter(user__isnull=True, rol_objetivo__isnull=True)

        return (qs_user | qs_rol | qs_global).distinct().order_by("-created_at")

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["patch"], url_path="leer")
    def leer(self, request, pk=None):
        obj = self.get_object()

        if getattr(request.user, "rol", None) != "admin":
            if obj.user_id not in [None, request.user.id]:
                return Response(
                    {"permitido": False, "motivo": "No autorizado."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if obj.read_at is None:
            obj.read_at = timezone.now()
            obj.save(update_fields=["read_at"])

        return Response(
            {"permitido": True, "motivo": None, "notificacion": NotificacionSerializer(obj).data},
            status=status.HTTP_200_OK,
        )


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
            raise ValidationError({"propietario": "Como admin debes enviar el propietario (id del aprendiz)."})

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
        return Response({"permitido": True, "motivo": None, "turno": TurnoSerializer(turno).data}, status=status.HTTP_201_CREATED)

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
        turno.save(update_fields=["activo", "fin"])

        return Response({"permitido": True, "motivo": None, "turno": TurnoSerializer(turno).data}, status=status.HTTP_200_OK)

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

    @action(detail=True, methods=["get"], url_path="resumen")
    def resumen(self, request, pk=None):
        turno = self.get_object()
        user = request.user
        rol = getattr(user, "rol", None)

        if rol == "guarda" and turno.guarda_id != user.id:
            return Response({"permitido": False, "motivo": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        qs = Acceso.objects.filter(turno=turno)
        ingresos = qs.filter(tipo=Acceso.Tipo.INGRESO).count()
        salidas = qs.filter(tipo=Acceso.Tipo.SALIDA).count()

        return Response(
            {
                "permitido": True,
                "motivo": None,
                "turno": TurnoSerializer(turno).data,
                "resumen": {"ingresos": ingresos, "salidas": salidas, "total": ingresos + salidas},
            },
            status=status.HTTP_200_OK,
        )


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

        qs = (
            Acceso.objects.all()
            .select_related("turno", "turno__guarda", "usuario", "registrado_por")
            .prefetch_related("equipos")
            .order_by("-fecha")
        )

        if rol == "admin":
            pass
        elif rol == "guarda":
            qs = qs.filter(turno__guarda=user)
        elif rol == "aprendiz":
            qs = qs.filter(usuario=user)
        else:
            qs = qs.none()

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
            qs = qs.filter(
                Q(usuario__documento__icontains=q)
                | Q(usuario__username__icontains=q)
                | Q(usuario__first_name__icontains=q)
                | Q(usuario__last_name__icontains=q)
                | Q(equipos__serial__icontains=q)
                | Q(equipos__marca__icontains=q)
                | Q(equipos__modelo__icontains=q)
            ).distinct()

        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            rol = getattr(self.request.user, "rol", None)
            if rol == "admin":
                return [IsAuthenticated(), IsAdmin()]
            return [IsAuthenticated(), IsGuarda()]

        if self.action in ["validar_documento", "registrar_por_documento", "stats"]:
            return [IsAuthenticated(), IsGuarda()]

        if self.action in ["mis_accesos", "estado"]:
            return [IsAuthenticated(), IsAprendiz()]

        return [IsAuthenticated()]

    def _validar_equipos_ingreso(self, aprendiz: Usuario, equipos: list[Equipo]):
        # Validación de propiedad y estado
        for eq in equipos:
            if eq.propietario_id != aprendiz.id:
                raise ValidationError({"equipos": "Uno de los equipos no pertenece al aprendiz."})
            if eq.estado != Equipo.Estado.APROBADO:
                raise ValidationError({"equipos": "Uno de los equipos no está aprobado."})

        # Regla extra: no permitir ingresar un equipo que ya está "dentro"
        for eq in equipos:
            ultimo_eq = Acceso.objects.filter(equipos=eq).order_by("-fecha").first()
            if ultimo_eq and ultimo_eq.tipo == Acceso.Tipo.INGRESO:
                raise ValidationError({"equipos": f"El equipo {eq.serial} ya tiene un ingreso activo."})

    def _validar_salida_equipos_vs_ultimo_ingreso(self, ultimo_ingreso: Acceso, equipos_enviados: list[Equipo]):
        ingreso_ids = sorted(list(ultimo_ingreso.equipos.values_list("id", flat=True)))
        enviados_ids = sorted([e.id for e in equipos_enviados])

        if ingreso_ids and not equipos_enviados:
            raise ValidationError({"equipos": "Salida inválida: debes seleccionar los mismos equipos del último ingreso."})

        if (not ingreso_ids) and equipos_enviados:
            raise ValidationError({"equipos": "Salida inválida: el último ingreso no tenía equipos."})

        if equipos_enviados and ingreso_ids != enviados_ids:
            raise ValidationError({"equipos": "Los equipos en la salida deben coincidir exactamente con los del último ingreso."})

    def create(self, request, *args, **kwargs):
        request_user = request.user
        rol = getattr(request_user, "rol", None)

        if rol not in ["admin", "guarda"]:
            return Response({"permitido": False, "motivo": "No tienes permisos para registrar accesos."}, status=status.HTTP_403_FORBIDDEN)

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

        # Reglas de equipos
        if tipo == Acceso.Tipo.INGRESO and equipos_enviados:
            self._validar_equipos_ingreso(aprendiz, list(equipos_enviados))

        if tipo == Acceso.Tipo.SALIDA:
            if not ultimo or ultimo.tipo != Acceso.Tipo.INGRESO:
                return Response(
                    {"permitido": False, "motivo": "Salida inválida: el último registro no es un ingreso."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Heredar sede/turno del ingreso (admin o guarda)
            sede = ultimo.sede
            turno = ultimo.turno

            # Validación estricta de equipos
            self._validar_salida_equipos_vs_ultimo_ingreso(ultimo, list(equipos_enviados))

        acceso = serializer.save(registrado_por=request_user, turno=turno, sede=sede)

        if equipos_enviados:
            acceso.equipos.set(list(equipos_enviados))

        return Response({"permitido": True, "motivo": None, "acceso": AccesoSerializer(acceso).data}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="validar_documento")
    def validar_documento(self, request):
        s = ValidarDocumentoSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        documento = s.validated_data["documento"]

        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response(
                {"permitido": False, "motivo": "Debes iniciar turno para validar y registrar accesos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        aprendiz = Usuario.objects.filter(documento=documento).first()
        if not aprendiz:
            return Response({"permitido": False, "motivo": "Documento no registrado."}, status=status.HTTP_404_NOT_FOUND)

        if getattr(aprendiz, "rol", None) != Usuario.Rol.APRENDIZ:
            return Response({"permitido": False, "motivo": "El documento no pertenece a un aprendiz."}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(aprendiz, "estado", None) == Usuario.Estado.BLOQUEADO:
            return Response({"permitido": False, "motivo": "El aprendiz está bloqueado."}, status=status.HTTP_403_FORBIDDEN)

        ultimo = Acceso.objects.filter(usuario=aprendiz).order_by("-fecha").first()
        estado = "dentro" if (ultimo and ultimo.tipo == Acceso.Tipo.INGRESO) else "fuera"

        equipos_aprobados = Equipo.objects.filter(propietario=aprendiz, estado=Equipo.Estado.APROBADO).order_by("-creado_en")

        return Response(
            {
                "permitido": True,
                "motivo": None,
                "estado": estado,
                "aprendiz": UsuarioSerializer(aprendiz).data,
                "equipos": EquipoSerializer(equipos_aprobados, many=True).data,
                "turno": TurnoSerializer(turno).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="registrar_por_documento")
    def registrar_por_documento(self, request):
        s = RegistrarAccesoDocumentoSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        documento = s.validated_data["documento"]
        tipo = s.validated_data["tipo"]
        equipos = s.validated_data.get("equipos", [])

        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response({"permitido": False, "motivo": "Debes iniciar turno antes de registrar accesos."}, status=status.HTTP_400_BAD_REQUEST)

        aprendiz = Usuario.objects.filter(documento=documento).first()
        if not aprendiz:
            return Response({"permitido": False, "motivo": "Documento no registrado."}, status=status.HTTP_404_NOT_FOUND)

        if getattr(aprendiz, "rol", None) != Usuario.Rol.APRENDIZ:
            return Response({"permitido": False, "motivo": "El documento no pertenece a un aprendiz."}, status=status.HTTP_400_BAD_REQUEST)

        ultimo = Acceso.objects.filter(usuario=aprendiz).order_by("-fecha").first()

        if ultimo is None and tipo == Acceso.Tipo.SALIDA:
            return Response({"permitido": False, "motivo": "Salida sin ingreso previo."}, status=status.HTTP_400_BAD_REQUEST)

        if ultimo is not None and ultimo.tipo == tipo:
            return Response({"permitido": False, "motivo": f"Doble {tipo}."}, status=status.HTTP_400_BAD_REQUEST)

        # Equipos
        if tipo == Acceso.Tipo.INGRESO and equipos:
            self._validar_equipos_ingreso(aprendiz, list(equipos))

        if tipo == Acceso.Tipo.SALIDA:
            if not ultimo or ultimo.tipo != Acceso.Tipo.INGRESO:
                return Response({"permitido": False, "motivo": "Salida inválida: el último registro no es un ingreso."}, status=status.HTTP_400_BAD_REQUEST)
            # Validación estricta de equipos
            self._validar_salida_equipos_vs_ultimo_ingreso(ultimo, list(equipos))

        acceso = Acceso.objects.create(
            usuario=aprendiz,
            tipo=tipo,
            fecha=timezone.now(),
            sede=turno.sede,
            turno=turno,
            registrado_por=request.user,
        )
        if equipos:
            acceso.equipos.set(list(equipos))

        return Response({"permitido": True, "motivo": None, "acceso": AccesoSerializer(acceso).data}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        turno = obtener_turno_activo(request.user)
        if not turno:
            return Response({"permitido": False, "motivo": "No tienes turno activo.", "stats": None}, status=status.HTTP_400_BAD_REQUEST)

        qs = Acceso.objects.filter(turno=turno)
        ingresos = qs.filter(tipo=Acceso.Tipo.INGRESO).count()
        salidas = qs.filter(tipo=Acceso.Tipo.SALIDA).count()

        return Response(
            {
                "permitido": True,
                "motivo": None,
                "turno": {"id": turno.id, "sede": turno.sede, "jornada": turno.jornada},
                "stats": {"ingresos": ingresos, "salidas": salidas, "total": ingresos + salidas},
            },
            status=status.HTTP_200_OK,
        )

    # ===== Aprendiz endpoints (para después, pero no estorban) =====
    @action(detail=False, methods=["get"], url_path="mis_accesos")
    def mis_accesos(self, request):
        qs = Acceso.objects.filter(usuario=request.user).order_by("-fecha")[:100]
        return Response(AccesoSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="estado")
    def estado(self, request):
        ultimo = Acceso.objects.filter(usuario=request.user).order_by("-fecha").first()
        estado = "dentro" if (ultimo and ultimo.tipo == Acceso.Tipo.INGRESO) else "fuera"
        return Response({"estado": estado}, status=status.HTTP_200_OK)
