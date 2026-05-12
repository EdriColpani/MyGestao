"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { apiFetch } from "@/lib/api";
import { setTokens } from "@/lib/auth-storage";

type Props = {
  redirectTo: string;
};

export function LoginForm({ redirectTo }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.prefetch(redirectTo);
  }, [router, redirectTo]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Falha no login");
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      setTokens(data.accessToken, data.refreshToken);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh min-h-screen items-center justify-center bg-gradient-to-br from-ocean-800 via-ocean-600 to-lagoon-600 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="flex justify-center">
          <BrandLogo className="max-w-[14rem]" imgClassName="max-w-full" priority />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-slate-900 sm:text-2xl">Entrar</h1>
        <p className="mt-1 text-sm text-slate-600">Acesse sua conta MyGestão</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-900 outline-none ring-ocean-600 focus:ring-2 sm:min-h-0 sm:py-2 sm:text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-900 outline-none ring-ocean-600 focus:ring-2 sm:min-h-0 sm:py-2 sm:text-sm"
            />
          </div>
          {error && <p className="break-words text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:py-2.5 sm:text-sm"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Não tem conta?{" "}
          <Link href="/register" className="font-semibold text-ocean-700 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
