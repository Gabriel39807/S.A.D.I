import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken, clearTokens } from "../storage/tokens";

export class UiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "UiError";
    this.code = code;
  }
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // evita “se demora resto de tiempo”
});

// Attach token
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// UI-friendly errors
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    // Sin respuesta => red / timeout / dns
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        throw new UiError("El servidor está tardando demasiado. Intenta de nuevo.", "TIMEOUT");
      }
      throw new UiError("No se pudo conectar al servidor. Revisa tu Wi-Fi y que el servidor esté encendido.", "NETWORK");
    }

    const status = error.response.status;
    const data = error.response.data;

    // Mensajes del backend (si existen)
    const motivo = typeof data?.motivo === "string" ? data.motivo : null;

    if (status === 401) {
      // Caso login: credenciales
      if (error.config?.url?.includes("/api/token/")) {
        throw new UiError("Usuario o contraseña incorrectos.", "BAD_CREDENTIALS");
      }
      // Caso token vencido
      await clearTokens();
      throw new UiError("Tu sesión expiró. Inicia sesión nuevamente.", "SESSION_EXPIRED");
    }

    if (status === 403) throw new UiError(motivo ?? "No tienes permisos para hacer esto.", "FORBIDDEN");
    if (status === 404) throw new UiError(motivo ?? "No encontramos lo que buscas.", "NOT_FOUND");
    if (status >= 500) throw new UiError("Error del servidor. Intenta más tarde.", "SERVER_ERROR");

    // 400/422 validación
    if (motivo) throw new UiError(motivo, "VALIDATION");
    throw new UiError("Ocurrió un error. Verifica los datos e intenta nuevamente.", "GENERIC");
  }
);
