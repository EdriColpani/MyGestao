"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase no browser (rotas `use client`). Requer NEXT_PUBLIC_* no build. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      "Supabase: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ex.: .env.local ou Vercel).",
    );
  }
  return createBrowserClient(url.trim(), key.trim());
}
