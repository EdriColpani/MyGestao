"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth-storage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-600">
        Carregando...
      </div>
    );
  }

  return <>{children}</>;
}
