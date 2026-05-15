"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "./public-env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente Supabase no browser (singleton — evita recriar em cada pedido à API). */
export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = requireSupabasePublicConfig();
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
