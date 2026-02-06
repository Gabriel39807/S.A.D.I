from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = "admin", "Admin"
        GUARDA = "guarda", "Guarda"
        APRENDIZ = "aprendiz", "Aprendiz"

    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.APRENDIZ)

    SEDE_CHOICES = [
    ("CEGAFE", "CEGAFE"),
    ("SANTA_CLARA", "SANTA CLARA"),
    ("ITEDRIS", "ITEDRIS"),
    ("GASTRONOMIA", "GASTRONOMIA"),
    ]

    sede_principal = models.CharField(
    max_length=20,
    choices=SEDE_CHOICES,
    null=True,
    blank=True
    )

    programa_formacion = models.CharField(max_length=100, null=True, blank=True)

    # QR / código de barras = número de documento
    documento = models.CharField(max_length=30, unique=True, null=True, blank=True)

    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        BLOQUEADO = "bloqueado", "Bloqueado"

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)


class Equipo(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    propietario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="equipos")
    serial = models.CharField(max_length=100, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    revisado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="equipos_revisados"
    )
    revisado_en = models.DateTimeField(null=True, blank=True)
    motivo_rechazo = models.CharField(max_length=255, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.serial} - {self.marca} {self.modelo} ({self.estado})"


class Turno(models.Model):
    class Sede(models.TextChoices):
        CEGAFE = "CEGAFE", "CEGAFE"
        SANTA_CLARA = "SANTA_CLARA", "SANTA CLARA"
        ITEDRIS = "ITEDRIS", "ITEDRIS"
        GASTRONOMIA = "GASTRONOMIA", "GASTRONOMIA"

    class Jornada(models.TextChoices):
        MANANA = "MANANA", "Mañana"
        TARDE = "TARDE", "Tarde"
        NOCHE = "NOCHE", "Noche"

    guarda = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="turnos")
    sede = models.CharField(max_length=30, choices=Sede.choices)
    jornada = models.CharField(max_length=20, choices=Jornada.choices)
    inicio = models.DateTimeField(auto_now_add=True)
    fin = models.DateTimeField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"Turno {self.guarda.username} - {self.sede} - {self.jornada} ({'activo' if self.activo else 'finalizado'})"


class Acceso(models.Model):
    class Tipo(models.TextChoices):
        INGRESO = "ingreso", "Ingreso"
        SALIDA = "salida", "Salida"

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="accesos")
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices)

    # auditoría / contexto
    registrado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="accesos_registrados"
    )
    turno = models.ForeignKey(Turno, on_delete=models.SET_NULL, null=True, blank=True, related_name="accesos")
    sede = models.CharField(max_length=30, choices=Turno.Sede.choices, null=True, blank=True)

    equipos = models.ManyToManyField(Equipo, blank=True, related_name="accesos")

    def __str__(self):
        return f"{self.usuario.username} - {self.tipo} - {self.fecha}"
