import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth-storage";

/** Rotas públicas: não enviar Bearer nem refresh+retry em 401. */
const PUBLIC_AUTH_JSON_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);

function isLoopbackUrl(url: string): boolean {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("[::1]")
  );
}

function isBrowserLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Base opcional para a API. Em produção (domínio real), URLs para localhost são ignoradas
 * para não quebrar o deploy na Vercel quando o .env local é copiado por engano.
 */
export function getApiBaseUrl(): string {
  const ext = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!ext) return "";

  if (typeof window === "undefined") {
    if (!isLoopbackUrl(ext)) return ext.replace(/\/$/, "");
    return "";
  }

  if (isBrowserLocalHost(window.location.hostname)) {
    return ext.replace(/\/$/, "");
  }
  if (!isLoopbackUrl(ext)) {
    return ext.replace(/\/$/, "");
  }
  return "";
}

function getServerSideOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return (process.env.NEXT_INTERNAL_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

/**
 * URL usada pelo `fetch`. No browser em produção, usa sempre `/api/...` no mesmo host,
 * exceto se NEXT_PUBLIC_API_URL for um URL público (ex.: API noutro domínio).
 */
export function resolveApiFetchUrl(path: string): string {
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const ext = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    if (ext && !isLoopbackUrl(ext)) {
      return `${ext.replace(/\/$/, "")}${pathNorm}`;
    }
    const origin = getServerSideOrigin();
    const apiPath = pathNorm.startsWith("/api") ? pathNorm : `/api${pathNorm}`;
    return `${origin}${apiPath}`;
  }

  const host = window.location.hostname;
  const local = isBrowserLocalHost(host);

  if (local && ext) {
    return `${ext.replace(/\/$/, "")}${pathNorm}`;
  }
  if (!local && ext && !isLoopbackUrl(ext)) {
    return `${ext.replace(/\/$/, "")}${pathNorm}`;
  }
  if (pathNorm.startsWith("/api")) {
    return pathNorm;
  }
  return `/api${pathNorm}`;
}

async function refreshAccess(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(resolveApiFetchUrl("/auth/refresh"), {
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
  const url = resolveApiFetchUrl(path);
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
