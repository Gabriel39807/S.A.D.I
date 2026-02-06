import axios from "axios";
import { API_URL } from "../config";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../storage/tokens";

export const api = axios.create({
  baseURL: API_URL,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err?.config;

    const is401 = err?.response?.status === 401;
    const isTokenCall = typeof original?.url === "string" && original.url.includes("/api/token");

    if (!is401 || isTokenCall || original?._retry) {
      return Promise.reject(err);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refresh = await getRefreshToken();
        if (!refresh) return null;

        try {
          const r = await axios.post(`${API_URL}/api/token/refresh/`, { refresh });
          const access = r.data?.access;
          if (!access) return null;

          await saveTokens(access, refresh);
          return access;
        } catch {
          await clearTokens();
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newAccess = await refreshPromise;
    if (!newAccess) return Promise.reject(err);

    original.headers = original.headers ?? {};
    original.headers.Authorization = `Bearer ${newAccess}`;
    return api(original);
  }
);
