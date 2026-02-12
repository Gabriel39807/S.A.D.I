# 🛡️ SADI
### Sistema de Acceso Digital Institucional

<p align="center">
  <b>Control de accesos · Turnos de guardas · Aprendices · Equipos · QR/Barcode · OTP</b>
</p>

<p align="center">
  <img alt="Django" src="https://img.shields.io/badge/Django-6.x-0C4B33?logo=django&logoColor=white">
  <img alt="DRF" src="https://img.shields.io/badge/DRF-API-red">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-DB-316192?logo=postgresql&logoColor=white">
  <img alt="JWT" src="https://img.shields.io/badge/Auth-JWT-6f42c1">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-Web-000000?logo=nextdotjs&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-Mobile-61DAFB?logo=react&logoColor=000">
</p>

---

## ✨ ¿Qué es SADI?

**SADI** es una plataforma para **controlar ingresos y salidas** en sedes institucionales, con:
- **Turnos** de guardas (inicio/finalización)
- **Registro de accesos** (ingreso/salida) con validaciones anti-duplicados
- **Gestión de aprendices** y **equipos**
- **Credenciales** mediante **QR** (descargable) y lector compatible con **código de barras**
- **Recuperación de contraseña** por **OTP** (PIN)

---

## 🧭 Tabla de Contenido
- [Arquitectura](#-arquitectura)
- [Roles](#-roles)
- [Reglas de negocio clave](#-reglas-de-negocio-clave)
- [Instalación backend](#-instalación-backend)
- [Endpoints principales](#-endpoints-principales)
- [Auditoría y saneo de turnos](#-auditoría-y-saneo-de-turnos)
- [Producción](#-producción)
- [Autor](#-autor)

---

## 🏗️ Arquitectura

```text
SADI/
├─ services/
│  └─ api/                  Backend (Django + DRF)
├─ apps/
│  ├─ web/                  Panel administrativo (Next.js)
│  └─ mobile/               App móvil (React Native)
└─ README.md
