import axios from "axios";
import { getAccessToken, clearTokens } from "./auth";

/**
 * API client (Axios) endurecido para Next.js App Router + Turbopack:
 * - No rompe en SSR
 * - No asume que `config.headers` exista
 * - Redirección a /login sólo si estamos en navegador y no estamos ya allí
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || undefined,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (!token) return config;

  // Axios 1.x puede usar AxiosHeaders (con .set) o un objeto simple.
  const h: any = config.headers ?? {};
  if (typeof h.set === "function") {
    h.set("Authorization", `Bearer ${token}`);
    config.headers = h;
  } else {
    config.headers = h;
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Si es 401 y estamos en navegador, limpiamos tokens y vamos a /login
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      clearTokens();

      // Evita loop de redirección si ya está en /login
      const isLogin = window.location?.pathname?.startsWith("/login");
      if (!isLogin) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);
