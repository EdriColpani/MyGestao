import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth-storage";

const DEFAULT_PORT = 3333;

/** Rotas públicas: não enviar Bearer (evita cabeçalho obsoleto) nem refresh+retry em 401. */
const PUBLIC_AUTH_JSON_PATHS = new Set(["/auth/login", "/auth/register"]);

/**
 * Resolve a URL base da API.
 * No navegador, se o site abrir por IP/domínio público e NEXT_PUBLIC_API_URL for localhost
 * (ou vazio), usa o mesmo host da página na porta DEFAULT_PORT — evita bloqueio PNA/CORS
 * de "site público chamando localhost".
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    return envUrl || `http://localhost:${DEFAULT_PORT}`;
  }

  const { protocol, hostname } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

  if (!isLocalHost) {
    const envPointsToLoopback =
      !envUrl ||
      envUrl.includes("localhost") ||
      envUrl.includes("127.0.0.1") ||
      envUrl.includes("[::1]");
    if (envPointsToLoopback) {
      return `${protocol}//${hostname}:${DEFAULT_PORT}`;
    }
    return envUrl;
  }

  return envUrl || `http://localhost:${DEFAULT_PORT}`;
}

async function refreshAccess(): Promise<boolean> {
  const base = getApiBaseUrl();
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = (await res.json()) as { accessToken: string };
  const nextRefresh = getRefreshToken();
  if (nextRefresh) {
    setTokens(data.accessToken, nextRefresh);
  } else {
    clearTokens();
    return false;
  }
  return true;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && getRefreshToken() && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
    const ok = await refreshAccess();
    if (ok) {
      const retryHeaders = new Headers(init?.headers);
      if (!retryHeaders.has("Content-Type") && init?.body) {
        retryHeaders.set("Content-Type", "application/json");
      }
      const t2 = getAccessToken();
      if (t2 && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
        retryHeaders.set("Authorization", `Bearer ${t2}`);
      }
      res = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
