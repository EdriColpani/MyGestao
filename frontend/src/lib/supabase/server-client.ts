import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "./public-env";

/** Cliente Supabase no servidor (Server Components, Route Handlers) com cookies de sessão. */
export async function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabasePublicConfig();

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* chamado a partir de Server Component sem mutar cookies */
        }
      },
    },
  });
}
