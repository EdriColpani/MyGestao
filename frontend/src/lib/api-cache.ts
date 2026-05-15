/** Cache em memoria de respostas GET da API (browser). */

const DEFAULT_TTL_MS = 45_000;

type CacheEntry = { data: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();

export function apiCacheKey(path: string, method = "GET"): string {
  return `${method}:${path}`;
}

export function getApiCache<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) store.delete(key);
    return undefined;
  }
  return hit.data as T;
}

export function setApiCache(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearApiDataCache(): void {
  store.clear();
}

/** Remove entradas GET cujo path contem o fragmento (ex.: "/expenses/purchases"). */
export function invalidateApiCacheByPath(fragment: string): void {
  for (const key of store.keys()) {
    if (key.startsWith("GET:") && key.includes(fragment)) {
      store.delete(key);
    }
  }
}
