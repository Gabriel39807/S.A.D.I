from __future__ import annotations

from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework import status


def ui_exception_handler(exc, context):
    # First, get DRF's default error response.
    response = exception_handler(exc, context)

    # If DRF couldn't handle it, return None (will become 500).
    if response is None:
        return response

    # Default shape
    payload = {
        "permitido": False,
        "motivo": "Ocurrió un error.",
    }

    # Friendly mapping
    if isinstance(exc, (NotAuthenticated,)):
        payload["motivo"] = "Debes iniciar sesión para continuar."
        response.status_code = status.HTTP_401_UNAUTHORIZED

    elif isinstance(exc, (AuthenticationFailed,)):
        # Includes invalid/expired token cases
        payload["motivo"] = "Tu sesión no es válida o expiró. Inicia sesión nuevamente."
        response.status_code = status.HTTP_401_UNAUTHORIZED

    elif isinstance(exc, (PermissionDenied,)):
        payload["motivo"] = "No tienes permisos para realizar esta acción."
        response.status_code = status.HTTP_403_FORBIDDEN

    elif isinstance(exc, (ValidationError,)):
        payload["motivo"] = "Datos inválidos."
        payload["errores"] = response.data
        response.status_code = status.HTTP_400_BAD_REQUEST

    else:
        # Try to extract a single message from response.data
        data = response.data
        if isinstance(data, dict):
            # If backend already uses {motivo: ...}
            if isinstance(data.get("motivo"), str):
                payload["motivo"] = data["motivo"]
                # keep extra fields if present
                extra = {k: v for k, v in data.items() if k not in ["motivo", "permitido"]}
                payload.update(extra)
            else:
                # Use common DRF 'detail'
                detail = data.get("detail")
                if isinstance(detail, str):
                    payload["motivo"] = detail

                # include field errors when present
                payload["errores"] = data
        elif isinstance(data, list) and data:
            payload["motivo"] = str(data[0])

    response.data = payload
    return response
