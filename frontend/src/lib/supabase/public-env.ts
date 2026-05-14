/**
 * URL e chave pública do Supabase (ficheiro `.env` na pasta `frontend`).
 * Aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (rótulo do painel).
 */

function stripOuterQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Acesso direto a `process.env.NEXT_PUBLIC_*` (não usar `process.env[nome]`):
 * o Next só embute essas variáveis no bundle do browser quando a referência é estática.
 */
export function getSupabasePublicUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw === undefined || raw === "") return undefined;
  const v = stripOuterQuotes(raw);
  return v || undefined;
}

/** Chave anon / publishable — qualquer um dos nomes no `.env`. */
export function getSupabaseAnonKey(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (raw === undefined || raw === "") return undefined;
  const v = stripOuterQuotes(raw);
  return v || undefined;
}

export function requireSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase: defina NEXT_PUBLIC_SUPABASE_URL e a chave pública no ficheiro .env na pasta frontend: NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Guarde o ficheiro e reinicie o servidor (npm run dev).",
    );
  }
  return { url, anonKey };
}
