export type Tokens = { access: string; refresh: string };

const ACCESS_KEY = "sadi_access";
const REFRESH_KEY = "sadi_refresh";

/**
 * Acceso seguro a localStorage:
 * - Evita crashes en SSR (Server Components)
 * - Evita crashes si el navegador bloquea storage (modo incógnito / políticas)
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveTokens(t: Tokens) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ACCESS_KEY, t.access);
    storage.setItem(REFRESH_KEY, t.refresh);
  } catch {
    // noop: si storage falla, no reventamos la app
  }
}

export function getAccessToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function clearTokens() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
  } catch {
    // noop
  }
}
