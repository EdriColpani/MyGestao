"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { ensureAppJwtFromSupabaseSession } from "@/lib/app-session";
import { getAccessToken } from "@/lib/auth-storage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (ready) return;
    let cancelled = false;
    void (async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser-client");
        const sb = createSupabaseBrowserClient();
        const { data } = await sb.auth.getSession();
        if (!cancelled && data.session) {
          if (!getAccessToken()) {
            await ensureAppJwtFromSupabaseSession(data.session.access_token);
          }
          if (!cancelled) setReady(true);
          return;
        }
      } catch {
        /* Supabase nao configurado: fallback JWT legado */
      }
      if (!cancelled && getAccessToken()) {
        setReady(true);
        return;
      }
      if (!cancelled) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, ready]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-600">
        Carregando...
      </div>
    );
  }

  return <>{children}</>;
}
