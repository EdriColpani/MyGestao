import { createClient } from "@supabase/supabase-js";

/** Valida access JWT do Supabase (sem service role). */
export async function verifySupabaseAccessToken(
  jwt: string,
): Promise<{ sub: string; email: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const supabase = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error || !user?.id) return null;
  return { sub: user.id, email: user.email ?? "" };
}
