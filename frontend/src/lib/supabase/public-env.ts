/**
 * URL e chave pública do Supabase.
 * Ordem: variáveis `NEXT_PUBLIC_SUPABASE_*` (ex.: .env local) → valores em `embedded-public-supabase.ts`.
 * Aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 */

import {
  EMBEDDED_SUPABASE_PUBLIC_ANON_KEY,
  EMBEDDED_SUPABASE_PUBLIC_URL,
} from "./embedded-public-supabase";

function stripOuterQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Acesso directo a `process.env.NEXT_PUBLIC_*` (referências estáticas para o bundle do browser).
 */
export function getSupabasePublicUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw !== undefined && raw !== "") {
    const v = stripOuterQuotes(raw);
    if (v) return v;
  }
  const fb = EMBEDDED_SUPABASE_PUBLIC_URL.trim();
  return fb || undefined;
}

/** Chave anon / publishable — env ou embutido. */
export function getSupabaseAnonKey(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (raw !== undefined && raw !== "") {
    const v = stripOuterQuotes(raw);
    if (v) return v;
  }
  const fb = EMBEDDED_SUPABASE_PUBLIC_ANON_KEY.trim();
  return fb || undefined;
}

export function requireSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase: preencha src/lib/supabase/embedded-public-supabase.ts ou defina NEXT_PUBLIC_SUPABASE_URL e chave anon no .env.",
    );
  }
  return { url, anonKey };
}
