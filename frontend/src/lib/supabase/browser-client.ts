"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "./public-env";

/** Cliente Supabase no browser (rotas `use client`). Variáveis em `frontend/.env`. */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabasePublicConfig();
  return createBrowserClient(url, anonKey);
}
