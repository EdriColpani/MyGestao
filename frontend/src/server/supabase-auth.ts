import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/supabase/public-env";

/** Valida access JWT do Supabase (sem service role). */
export async function verifySupabaseAccessToken(
  jwt: string,
): Promise<{ sub: string; email: string } | null> {
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
    return { sub: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}
