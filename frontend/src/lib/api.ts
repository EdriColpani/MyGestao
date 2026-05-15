import {
  apiCacheKey,
  clearApiDataCache,
  getApiCache,
  setApiCache,
} from "./api-cache";
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

/** Só usa NEXT_PUBLIC_API_URL se for o mesmo host que a página (evita CORS com domínio próprio vs vercel.app). */
function externalApiBaseForBrowser(ext: string): string {
  if (!ext || isLoopbackUrl(ext)) return "";
  if (typeof window === "undefined") return ext.replace(/\/$/, "");

  if (isBrowserLocalHost(window.location.hostname)) {
    return ext.replace(/\/$/, "");
  }

  try {
    const u = new URL(ext.includes("://") ? ext : `https://${ext}`);
    if (u.hostname === window.location.hostname) {
      return ext.replace(/\/$/, "");
    }
  } catch {
    return "";
  }
  return "";
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

  return externalApiBaseForBrowser(ext);
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

  const extBase = externalApiBaseForBrowser(ext ?? "");
  if (extBase) {
    return `${extBase}${pathNorm}`;
  }
  if (pathNorm.startsWith("/api")) {
    return pathNorm;
  }
  return `/api${pathNorm}`;
}

const BEARER_CACHE_MS = 55_000;
let cachedBearer: string | null = null;
let cachedBearerAt = 0;

/** Limpa token em memoria (logout, 401, etc.). */
export function invalidateApiAuthCache(): void {
  cachedBearer = null;
  cachedBearerAt = 0;
}

/** Define JWT da app em cache apos sync-profile / login. */
export function primeBearerCache(accessToken: string): void {
  cachedBearer = accessToken;
  cachedBearerAt = Date.now();
}

async function getBearerForApi(): Promise<string | null> {
  if (typeof window !== "undefined" && cachedBearer && Date.now() - cachedBearerAt < BEARER_CACHE_MS) {
    return cachedBearer;
  }

  const appJwt = getAccessToken();
  if (appJwt) {
    cachedBearer = appJwt;
    cachedBearerAt = Date.now();
    return appJwt;
  }

  if (typeof window !== "undefined") {
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser-client");
      const sb = createSupabaseBrowserClient();
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) {
        cachedBearer = data.session.access_token;
        cachedBearerAt = Date.now();
        return cachedBearer;
      }
    } catch {
      /* Supabase nao configurado ou erro de sessao */
    }
  }

  return null;
}

async function refreshSupabaseSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser-client");
    const sb = createSupabaseBrowserClient();
    const { data, error } = await sb.auth.refreshSession();
    if (error || !data.session) {
      await sb.auth.signOut();
      clearTokens();
      invalidateApiAuthCache();
      return false;
    }
    invalidateApiAuthCache();
    if (!getAccessToken() && data.session.access_token) {
      const sync = await fetch(resolveApiFetchUrl("/auth/sync-profile"), {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (sync.ok) {
        const { applySyncProfileTokens } = await import("./app-session");
        applySyncProfileTokens((await sync.json()) as import("./app-session").SyncProfileBody);
      }
    }
    return true;
  } catch {
    clearTokens();
    invalidateApiAuthCache();
    return false;
  }
}

async function refreshLegacyAccess(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(resolveApiFetchUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    invalidateApiAuthCache();
    return false;
  }

  const data = (await res.json()) as { accessToken: string };
  const nextRefresh = getRefreshToken();
  if (nextRefresh) {
    setTokens(data.accessToken, nextRefresh);
    invalidateApiAuthCache();
  } else {
    clearTokens();
    invalidateApiAuthCache();
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

  const token = await getBearerForApi();
  if (token && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
    invalidateApiAuthCache();
    const legacyOk = getRefreshToken() ? await refreshLegacyAccess() : false;
    const supabaseOk = !legacyOk ? await refreshSupabaseSession() : false;
    const ok = legacyOk || supabaseOk;
    if (ok) {
      const retryHeaders = new Headers(init?.headers);
      if (!retryHeaders.has("Content-Type") && init?.body) {
        retryHeaders.set("Content-Type", "application/json");
      }
      const t2 = await getBearerForApi();
      if (t2 && !PUBLIC_AUTH_JSON_PATHS.has(path)) {
        retryHeaders.set("Authorization", `Bearer ${t2}`);
      }
      res = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

  return res;
}

function invalidateCacheAfterMutation(_path: string): void {
  clearApiDataCache();
}

/** Pre-carrega GETs em segundo plano (menu hover). */
export function prefetchApiJson(...paths: string[]): void {
  for (const path of paths) {
    const key = apiCacheKey(path);
    if (getApiCache(key) !== undefined) continue;
    void apiJson(path).catch(() => {
      /* prefetch silencioso */
    });
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const cacheKey = apiCacheKey(path, method);

  if (method === "GET") {
    const hit = getApiCache<T>(cacheKey);
    if (hit !== undefined) return hit;
  }

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
    if (method !== "GET") invalidateCacheAfterMutation(path);
    return undefined as T;
  }
  const data = (await res.json()) as T;
  if (method === "GET") {
    setApiCache(cacheKey, data);
  } else {
    invalidateCacheAfterMutation(path);
  }
  return data;
}
