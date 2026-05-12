"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { clearTokens } from "@/lib/auth-storage";

const nav = [
  { href: "/dashboard", label: "Dashboard", short: "Início" },
  { href: "/incomes", label: "Receitas mensais", short: "Receitas" },
  { href: "/expenses", label: "Despesas", short: "Despesas" },
  { href: "/payments", label: "Pagamento mensal", short: "Pagar" },
  { href: "/reports", label: "Relatórios", short: "Relat." },
  { href: "/cards", label: "Cartões", short: "Cartões" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const logout = () => {
    clearTokens();
    router.replace("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1 p-4 md:p-0" aria-label="Principal">
      {nav.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-xl px-4 py-3 text-base font-medium transition md:rounded-lg md:px-3 md:py-2 md:text-sm ${
              active
                ? "bg-white/20 text-white shadow-inner md:bg-white/15"
                : "text-emerald-50/95 active:bg-white/15 md:hover:bg-white/10"
            }`}
          >
            <span className="md:hidden">{item.short}</span>
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-emerald-50/50">
      <div className="flex min-h-dvh min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/40 bg-gradient-to-b from-ocean-800 to-emerald-800 p-6 text-white shadow-xl md:flex">
          <div className="mb-8">
            <BrandLogo href="/dashboard" imgClassName="max-w-[11.5rem]" priority />
            <p className="mt-3 text-xs text-emerald-100/90">Finanças pessoais</p>
          </div>
          <div className="flex flex-1 flex-col">
            <NavLinks />
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-lg border border-white/20 px-3 py-3 text-sm font-medium text-emerald-50 hover:bg-white/10 md:py-2"
          >
            Sair
          </button>
        </aside>

        <div className="flex min-h-dvh min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-3 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-ocean-800 shadow-sm active:bg-slate-50"
                aria-expanded={menuOpen}
                aria-controls="mobile-drawer"
                aria-label="Abrir menu"
              >
                <span className="flex flex-col gap-1.5" aria-hidden>
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <BrandLogo
                  href="/dashboard"
                  imgClassName="max-h-8 max-w-[10rem] object-left"
                  linkClassName="focus-visible:ring-ocean-600 focus-visible:ring-offset-white"
                />
                <p className="truncate text-xs text-slate-500">Finanças pessoais</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 underline-offset-2 active:text-emerald-950"
              >
                Sair
              </button>
            </div>
          </header>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] md:hidden"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              />
              <aside
                id="mobile-drawer"
                className="fixed left-0 top-0 z-50 flex h-dvh max-h-screen w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-white/20 bg-gradient-to-b from-ocean-800 to-emerald-800 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white shadow-2xl md:hidden"
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                  <BrandLogo
                    href="/dashboard"
                    imgClassName="max-w-[12rem]"
                    onLinkClick={() => setMenuOpen(false)}
                  />
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
                    aria-label="Fechar"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-y-contain">
                  <NavLinks onNavigate={() => setMenuOpen(false)} />
                </div>
              </aside>
            </>
          )}

          <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 md:p-8 md:pb-8 md:pt-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
