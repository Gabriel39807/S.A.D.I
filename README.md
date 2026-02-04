diff --git a/README.md b/README.md
index 6b5b221aed356821feee4c3113ec26bcaa63ab1b..c37275cb147e8da4d0edbc3bcb7470b568ec0ad6 100644
--- a/README.md
+++ b/README.md
@@ -1,47 +1,499 @@
-# AccesoSEN – Sistema de Control de Acceso
+# SADI – Sistema de Accesos y Dispositivos Institucionales
 
-## Descripción
-Sistema web para el control de acceso de aprendices, personal de seguridad y administradores del SENA.
+> ⚠️ **Nota importante**  
+> Este README reemplaza el enfoque anterior. SADI ya es un sistema **full‑stack funcional** (no simulación).
 
-## Alcance
-En esta fase se desarrollan los primeros módulos del sistema a nivel frontend, simulando la lógica del sistema.
+## Descripción general
+SADI es un sistema integral para el control de accesos de aprendices, personal de seguridad y administradores, con gestión de ingresos, salidas, equipos, turnos y auditoría. Todas las reglas de negocio se ejecutan en backend.
 
-## Metodología
-Se utilizó la metodología ágil SCRUM, desarrollando el proyecto por módulos funcionales.
+## Alcance actual del proyecto
+✅ **Backend (Django + DRF)**
+- Autenticación JWT (access + refresh)
+- Roles: **ADMIN**, **APRENDIZ**, **GUARDA**
+- Registro de accesos (ingreso / salida)
+- Gestión de equipos
+- Turnos de personal de seguridad
+- Validaciones críticas de negocio
+- PostgreSQL en Docker (**puerto 5433**)
 
-## Módulos desarrollados
+🖥️ **Frontend Web (React – escritorio)**
+- Panel Admin avanzado: usuarios, equipos, accesos, turnos
+- Paginación, filtros con debounce y skeleton loaders
+- UI optimizada para escritorio
+- Conectado al backend real
 
-### Módulo 1 – Autenticación
-- Inicio de sesión
-- Recuperación de contraseña
-- Cambio de contraseña
-- Validaciones básicas
+📱 **Frontend Móvil (React Native – Expo)**
+- Enfoque mobile‑first
+- Basado en diseño oficial (PDF/Figma)
+- En progreso: Aprendiz → luego Guarda
 
-### Módulo 2 – Gestión del Aprendiz
-- Panel principal
-- Historial de accesos
-- Gestión de equipos
+## Cambio clave respecto al README anterior
+❌ **Enfoque anterior (obsoleto)**: frontend estático + lógica simulada.  
+✅ **Enfoque actual (real)**: backend Django + DRF activo, frontends consumiendo API real y reglas estrictas.
+
+## Roles del sistema
+- **ADMIN**: gestión total (usuarios, equipos, accesos, turnos, auditoría)
+- **APRENDIZ**: historial de accesos, gestión de equipos, perfil
+- **GUARDA**: registro de ingresos/salidas, escaneo QR/manual, turnos
+
+## Autenticación y seguridad
+- JWT con refresh token
+- Permisos por rol en backend
+- Validaciones server‑side obligatorias
+
+## Base de datos
+- PostgreSQL en Docker (puerto **5433**)
+- Modelos principales: **Usuario** (custom), **Acceso**, **Equipo**, **Turno**
+- Relación aprendiz ↔ equipo
+
+## Stack tecnológico definitivo
+**Backend**
+- Python, Django, Django REST Framework, PostgreSQL, Docker
+
+**Frontend Web**
+- React, Axios, paginación + filtros, UI desktop
+
+**Frontend Móvil**
+- React Native, Expo, React Navigation
+- Axios + interceptores, TanStack Query, Zustand, SecureStore
+
+## Estructura general del repositorio
+```
+SADI/
+  apps/
+    web/        # React (Admin / Aprendiz escritorio)
+    mobile/     # React Native (Aprendiz / Guarda)
+  services/
+    api/        # Django + DRF
+  docs/
+    figma/
+    arquitectura/
+```
+
+## Diseño y UX
+El diseño oficial fue realizado en Figma. El PDF del sistema sirve como referencia visual y funcional. Los frontends respetan flujos, colores y jerarquía definidos.
+
+## Estado actual
+- Backend: ✅ completo y estable
+- Web Admin: ✅ casi finalizado
+- Web Aprendiz: 🟡 en progreso
+- Mobile Aprendiz: 🟡 iniciando (base lista)
+- Mobile Guarda: ⏳ siguiente fase
+
+## Próximo enfoque para Codex
+- Continuar frontend móvil en React Native
+- Implementar Aprendiz móvil completo
+- Implementar Guarda móvil
+- Ajustar backend solo si falta algún endpoint específico
+
+## Instalación inicial de recursos (base para el equipo)
+> Enfoque: mantener el backend estable y avanzar el frontend móvil/web.
+
+### Requisitos locales
+- **Node.js LTS** (para web y móvil con React Native).
+- **Python 3.11+** (backend Django).
+- **Docker** (para base de datos y servicios).
+- **PostgreSQL** (local o vía Docker).
+- **Git** y un editor (VS Code recomendado).
+
+### Paquetes y herramientas sugeridas
+- **Gestor de paquetes**: pnpm (o npm/yarn).
+- **CLI útiles**:
+  - `npx create-react-app` (web) o `npx create-expo-app` (móvil).
+
+## Instalación y configuración paso a paso (stack recomendado: Django + React + PostgreSQL)
+> Este es el camino sugerido para tu perfil (Python + JS básico) y priorizar calidad.
+
+### 1) Herramientas base
+1. Instala **Git** y **VS Code**.
+2. Instala **Python 3.11+**.
+3. Instala **Node.js LTS** (incluye npm).
+4. Instala **Docker Desktop** (para PostgreSQL local y servicios).
+
+**¿Desde dónde abrir la terminal?**  
+Si estás trabajando en VS Code, usa la terminal integrada (**Terminal > New Terminal**) y abre el proyecto desde ahí.  
+También puedes usar la terminal normal de Windows, pero asegúrate de estar ubicado en la carpeta del repositorio con `cd /ruta/al/proyecto`.
+
+### 2) Backend (Django + DRF)
+> Si el backend ya está implementado en `services/api`, omite los pasos de creación del proyecto.
+1. Crea un entorno virtual:
+   ```
+   python -m venv .venv
+   ```
+2. Activa el entorno:
+   - Windows:
+     ```
+     .venv\Scripts\activate
+     ```
+   - macOS/Linux:
+     ```
+     source .venv/bin/activate
+     ```
+3. Instala dependencias base:
+   ```
+   pip install django djangorestframework psycopg[binary] python-dotenv
+   ```
+4. Crea el proyecto:
+   ```
+   django-admin startproject accesosen_api .
+   ```
+
+✅ Si ya ves la pantalla de Django en `http://127.0.0.1:8000/`, el backend está corriendo.
+
+**Siguiente paso recomendado:** configurar PostgreSQL y conectar Django a la base de datos (paso 3).
+
+### 3) Base de datos (PostgreSQL en Docker)
+1. Levanta PostgreSQL con Docker Compose:
+   ```
+   docker compose up -d
+   ```
+2. Verifica que el contenedor esté activo:
+   ```
+   docker ps
+   ```
+3. Agrega las variables en `.env` (ejemplo):
+   ```
+   DATABASE_URL=postgres://postgres:postgres@localhost:5433/accesosen
+   ```
+4. Para detener el contenedor:
+   ```
+   docker compose down
+   ```
+
+### 3.1) Conectar Django a PostgreSQL
+1. Crea un archivo `.env` dentro de `services/api` con esta variable:
+   ```
+   DATABASE_URL=postgres://postgres:postgres@localhost:5433/accesosen
+   ```
+2. En `services/api/accesosen_api/settings.py`, carga la variable y configura `DATABASES`:
+   ```python
+   import os
+   from pathlib import Path
+
+   from dotenv import load_dotenv
+
+   load_dotenv()
+
+   BASE_DIR = Path(__file__).resolve().parent.parent
+
+   DATABASES = {
+       "default": {
+           "ENGINE": "django.db.backends.postgresql",
+           "NAME": "accesosen",
+           "USER": "postgres",
+           "PASSWORD": "postgres",
+           "HOST": "localhost",
+           "PORT": "5433",
+       }
+   }
+   ```
+3. Instala `python-dotenv` si no lo hiciste:
+   ```
+   pip install python-dotenv
+   ```
+4. Prueba la conexión ejecutando migraciones:
+   ```
+   python manage.py migrate
+   ```
+
+### 4) Primer módulo (usuarios/roles/accesos)
+> Objetivo: crear una app Django con los modelos base para roles y registro de accesos.
+
+1. Crea la app:
+   ```
+   python manage.py startapp accesos
+   ```
+2. Registra la app en `INSTALLED_APPS` dentro de `services/api/accesosen_api/settings.py`:
+   ```python
+   INSTALLED_APPS = [
+       # ...
+       "accesos",
+   ]
+   ```
+3. Crea los modelos base en `services/api/accesos/models.py` (ejemplo mínimo):
+   ```python
+   from django.contrib.auth.models import AbstractUser
+   from django.db import models
+
+   class Usuario(AbstractUser):
+       class Rol(models.TextChoices):
+           ADMIN = "admin", "Admin"
+           GUARDA = "guarda", "Guarda"
+           APRENDIZ = "aprendiz", "Aprendiz"
+
+       rol = models.CharField(max_length=20, choices=Rol.choices)
+
+
+   class Acceso(models.Model):
+       usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
+       fecha = models.DateTimeField(auto_now_add=True)
+       tipo = models.CharField(
+           max_length=10,
+           choices=[("ingreso", "Ingreso"), ("salida", "Salida")],
+       )
+   ```
+4. En `settings.py`, indica el modelo de usuario personalizado:
+   ```python
+   AUTH_USER_MODEL = "accesos.Usuario"
+   ```
+5. Ejecuta migraciones:
+   ```
+   python manage.py makemigrations
+   python manage.py migrate
+   ```
+
+✅ Cuando tengas esto listo, seguimos con: autenticación (JWT) y endpoints REST con Django REST Framework.
+
+### 5) Permisos por roles (admin/guarda/aprendiz)
+> Objetivo: restringir endpoints según el rol del usuario.
+
+1. Crea un permiso personalizado en `services/api/accesos/permissions.py`:
+   ```python
+   from rest_framework.permissions import BasePermission
+
+   class EsAdmin(BasePermission):
+       def has_permission(self, request, view):
+           return request.user.is_authenticated and request.user.rol == "admin"
+
+
+   class EsGuarda(BasePermission):
+       def has_permission(self, request, view):
+           return request.user.is_authenticated and request.user.rol == "guarda"
+
+
+   class EsAprendiz(BasePermission):
+       def has_permission(self, request, view):
+           return request.user.is_authenticated and request.user.rol == "aprendiz"
+   ```
+2. Aplica permisos en los ViewSets (ejemplo):
+   ```python
+   from rest_framework.permissions import IsAuthenticated
+   from .permissions import EsAdmin, EsGuarda
+
+   class UsuarioViewSet(viewsets.ModelViewSet):
+       permission_classes = [IsAuthenticated, EsAdmin]
+
+   class AccesoViewSet(viewsets.ModelViewSet):
+       permission_classes = [IsAuthenticated, EsGuarda]
+   ```
+3. Prueba con usuarios de roles distintos usando JWT.
+
+✅ Cuando tengas esto listo, seguimos con: serializadores avanzados y validaciones de negocio.
+
+### 6) Registro de accesos por QR / código de carnet (sin fotos)
+> Flujo principal: el **guarda** escanea un código y el backend registra el acceso del aprendiz.
+
+#### 6.1) Modelo: agregar `codigo_carnet` al usuario
+En `services/api/accesos/models.py`, añade el campo:
+```python
+class Usuario(AbstractUser):
+    class Rol(models.TextChoices):
+        ADMIN = "admin", "Admin"
+        GUARDA = "guarda", "Guarda"
+        APRENDIZ = "aprendiz", "Aprendiz"
+
+    rol = models.CharField(max_length=20, choices=Rol.choices)
+    codigo_carnet = models.CharField(max_length=50, unique=True, null=True, blank=True)
+```
+
+Luego ejecuta migraciones:
+```
+python manage.py makemigrations
+python manage.py migrate
+```
+
+#### 6.2) Serializer de entrada para el QR
+En `services/api/accesos/serializers.py`:
+```python
+from rest_framework import serializers
+
+class RegistrarAccesoQRSerializer(serializers.Serializer):
+    codigo = serializers.CharField()
+    tipo = serializers.ChoiceField(choices=["ingreso", "salida"])
+
+    def validate_codigo(self, value):
+        return value.strip().upper()
+```
+
+#### 6.3) Permiso: solo Guarda (opcional Admin configurable)
+En `services/api/accesos/permissions.py`:
+```python
+from rest_framework.permissions import BasePermission
+
+class EsGuarda(BasePermission):
+    def has_permission(self, request, view):
+        return request.user.is_authenticated and request.user.rol == "guarda"
+
+class EsGuardaOAdmin(BasePermission):
+    def has_permission(self, request, view):
+        return request.user.is_authenticated and request.user.rol in ["guarda", "admin"]
+```
+
+#### 6.4) View / action para registrar por QR
+En `services/api/accesos/views.py`:
+```python
+from rest_framework import status, viewsets
+from rest_framework.decorators import action
+from rest_framework.permissions import IsAuthenticated
+from rest_framework.response import Response
+
+from .models import Acceso, Usuario
+from .permissions import EsGuarda
+from .serializers import RegistrarAccesoQRSerializer
+
+class AccesoViewSet(viewsets.ModelViewSet):
+    # queryset / serializer_class normales aquí...
+
+    @action(
+        detail=False,
+        methods=["post"],
+        url_path="registrar_por_qr",
+        permission_classes=[IsAuthenticated, EsGuarda],
+    )
+    def registrar_por_qr(self, request):
+        serializer = RegistrarAccesoQRSerializer(data=request.data)
+        serializer.is_valid(raise_exception=True)
+
+        codigo = serializer.validated_data["codigo"]
+        tipo = serializer.validated_data["tipo"]
+
+        usuario = Usuario.objects.filter(codigo_carnet=codigo).first()
+        if not usuario:
+            return Response(
+                {"permitido": False, "motivo": "codigo no existe"},
+                status=status.HTTP_404_NOT_FOUND,
+            )
+        if usuario.rol != "aprendiz":
+            return Response(
+                {"permitido": False, "motivo": "usuario no es aprendiz"},
+                status=status.HTTP_400_BAD_REQUEST,
+            )
+
+        ultimo = Acceso.objects.filter(usuario=usuario).order_by("-fecha").first()
+        if tipo == "salida" and not ultimo:
+            return Response(
+                {"permitido": False, "motivo": "salida sin ingreso previo"},
+                status=status.HTTP_400_BAD_REQUEST,
+            )
+        if ultimo and ultimo.tipo == tipo:
+            return Response(
+                {"permitido": False, "motivo": f\"doble {tipo}\"},
+                status=status.HTTP_400_BAD_REQUEST,
+            )
+
+        acceso = Acceso.objects.create(usuario=usuario, tipo=tipo)
+        return Response(
+            {
+                "permitido": True,
+                "acceso": {
+                    "id": acceso.id,
+                    "fecha": acceso.fecha,
+                    "tipo": acceso.tipo,
+                },
+                "aprendiz": {
+                    "id": usuario.id,
+                    "username": usuario.username,
+                    "rol": usuario.rol,
+                },
+            },
+            status=status.HTTP_201_CREATED,
+        )
+```
+
+#### 6.5) URLs
+Ya existe el router en `services/api/accesos/urls.py`; al estar el action en `AccesoViewSet`,
+el endpoint queda así:
+```
+POST /api/accesos/registrar_por_qr/
+```
+
+#### 6.6) Probar con JWT (solo Guarda)
+1. Autentica como **guarda**.
+2. Envía:
+   ```json
+   { "codigo": "ABC123", "tipo": "ingreso" }
+   ```
+3. Respuesta esperada:
+   - **201** con `permitido: true`
+   - **400/404** con `permitido: false` y motivo claro.
+
+✅ Cuando tengas esto listo, seguimos con: reportes y auditoría de accesos.
+
+### 4) Frontend web (React)
+1. Crea la app:
+   ```
+   npx create-react-app accesosen-web
+   ```
+2. Entra a la carpeta y ejecuta:
+   ```
+   npm start
+   ```
+
+### 5) Frontend móvil (React Native - opcional para iniciar)
+> Si quieres empezar con móvil después del backend+web, puedes saltarte este paso por ahora.
+1. Instala la CLI:
+   ```
+   npm install -g expo-cli
+   ```
+2. Crea la app:
+   ```
+   expo init accesosen-mobile
+   ```
+3. Ejecuta:
+   ```
+   expo start
+   ```
+
+### Estructura sugerida del repositorio
+```
+/apps
+  /mobile    (Flutter o React Native)
+  /web       (Next.js)
+/services
+  /api       (NestJS o Django)
+/docs
+  /arquitectura
+  /requisitos
+```
 
-## Tecnologías utilizadas
-- HTML5
-- CSS3
-- JavaScript
-- Figma
+### Ejemplo de ruta por carpetas
+```
+AccesoSEN/
+  apps/
+    web/
+      src/
+        components/
+        pages/
+      public/
+    mobile/
+      lib/
+        screens/
+        widgets/
+  services/
+    api/
+      accesosen_api/
+        settings.py
+        urls.py
+      manage.py
+  docs/
+    arquitectura/
+    requisitos/
+```
 
 ## Pruebas
 Se realizaron pruebas funcionales de navegación, validación de formularios y simulación de datos.
 
 ## Prototipado en Figma
 
 El diseño de interfaces del sistema fue realizado utilizando la herramienta Figma.
 
 🔗 Enlace al prototipo:
 https://www.figma.com/proto/5ISeb2fQWrzTScAifnd99E/Front-End-AccesoSEN?node-id=0-1&t=E8nmX54nrDKj1U2T-1
 🔗 Enlance de los modulos: 
 https://accesosen.vercel.app
 
 Debido a que Figma no permite una exportación directa de prototipos a repositorios GitHub, el prototipado se referencia mediante:
 
 - Enlace directo al proyecto en Figma
 - Capturas de las interfaces ubicadas en la carpeta `/figma`
 - Implementación del frontend respetando la estructura visual y funcional definida en el prototipo
