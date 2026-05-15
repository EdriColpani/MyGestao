import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/supabase/public-env";

const VERIFY_CACHE_TTL_MS = 90_000;
const VERIFY_CACHE_MAX = 128;

type CachedUser = { sub: string; email: string; expiresAt: number };

const verifyCache = new Map<string, CachedUser>();

function readVerifyCache(jwt: string): { sub: string; email: string } | null {
  const hit = verifyCache.get(jwt);
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) verifyCache.delete(jwt);
    return null;
  }
  return { sub: hit.sub, email: hit.email };
}

function writeVerifyCache(jwt: string, user: { sub: string; email: string }): void {
  if (verifyCache.size >= VERIFY_CACHE_MAX) {
    const oldest = verifyCache.keys().next().value;
    if (oldest) verifyCache.delete(oldest);
  }
  verifyCache.set(jwt, {
    ...user,
    expiresAt: Date.now() + VERIFY_CACHE_TTL_MS,
  });
}

/** Valida access JWT do Supabase (sem service role). Resultado em cache curto para nao chamar a API a cada pedido. */
export async function verifySupabaseAccessToken(
  jwt: string,
): Promise<{ sub: string; email: string } | null> {
  const cached = readVerifyCache(jwt);
  if (cached) return cached;

  const url = getSupabasePublicUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) return null;

  try {
    const supabase = createClient(url, anon);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt);
    if (error || !user?.id) return null;
    const out = { sub: user.id, email: user.email ?? "" };
    writeVerifyCache(jwt, out);
    return out;
  } catch {
    return null;
  }
}
