import { invalidateApiAuthCache, primeBearerCache, resolveApiFetchUrl } from "@/lib/api";
import { clearApiDataCache } from "@/lib/api-cache";
import { getAccessToken, setTokens } from "@/lib/auth-storage";

export type SyncProfileBody = {
  ok?: boolean;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
};

/** Guarda JWT da app devolvidos pelo sync-profile. */
export function applySyncProfileTokens(body: SyncProfileBody): boolean {
  if (!body.accessToken || !body.refreshToken) return false;
  setTokens(body.accessToken, body.refreshToken);
  invalidateApiAuthCache();
  primeBearerCache(body.accessToken);
  return true;
}

/** Obtem JWT da app a partir da sessao Supabase (utilizadores ja logados). */
export async function ensureAppJwtFromSupabaseSession(supabaseAccessToken: string): Promise<boolean> {
  if (getAccessToken()) return true;

  const res = await fetch(resolveApiFetchUrl("/auth/sync-profile"), {
    method: "POST",
    headers: { Authorization: `Bearer ${supabaseAccessToken}` },
  });

  if (!res.ok) return false;

  const body = (await res.json()) as SyncProfileBody;
  return applySyncProfileTokens(body);
}

/** Processa resposta do sync-profile apos login/registo. */
export async function applySyncProfileResponse(res: Response): Promise<void> {
  const body = (await res.json()) as SyncProfileBody;
  if (!res.ok) {
    throw new Error(body.message ?? `Erro ${res.status}`);
  }
  if (!applySyncProfileTokens(body)) {
    throw new Error("Resposta de sincronizacao invalida");
  }
}

export function clearAppSession(): void {
  clearApiDataCache();
}
