"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { apiJson } from "@/lib/api";
import { currentYearMonth, rollingYearMonths } from "@/lib/month";
import { formatBRL } from "@/lib/money";

type Summary = {
  referenceMonth: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingAmount: number;
};

type ChartRes = {
  series: { month: string; income: number; expense: number }[];
  indicators: { totalIncome: number; totalExpense: number; balance: number; savingsRate: number };
};

type ByCardRow = { cardId: string; cardName: string | null; totalAmount: number };

export default function DashboardPage() {
  const defaultYm = useMemo(() => currentYearMonth(), []);
  const [ym, setYm] = useState(defaultYm);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<ChartRes | null>(null);
  const [byCard, setByCard] = useState<ByCardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c, b] = await Promise.all([
          apiJson<Summary>(`/dashboard/summary?referenceMonth=${ym}`),
          apiJson<ChartRes>(`/reports/charts/monthly?months=6`),
          apiJson<ByCardRow[]>(`/reports/summary/by-card?fromMonth=${ym}&toMonth=${ym}`),
        ]);
        if (!cancelled) {
          setSummary(s);
          setChart(c);
          setByCard(b);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ym]);

  const months = rollingYearMonths(18);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-slate-600 sm:text-base">Visão geral do mês e tendências recentes</p>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Mês de referência</label>
          <select
            value={ym}
            onChange={(e) => setYm(e.target.value)}
            className="mt-1 block w-full min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 md:w-auto"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Receitas do mês", value: summary.totalIncome, tone: "text-ocean-700" },
            { label: "Despesas (fluxo)", value: summary.totalExpense, tone: "text-lagoon-600" },
            { label: "Saldo", value: summary.balance, tone: "text-slate-900" },
            { label: "Parcelas pendentes (mês)", value: summary.pendingAmount, tone: "text-amber-700" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-2 text-xl font-semibold tabular-nums sm:text-2xl ${card.tone}`}>
                {formatBRL(card.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {chart && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 text-sm text-slate-600 backdrop-blur">
          <span className="font-medium text-slate-800">Últimos 6 meses — </span>
          taxa de poupança média:{" "}
          <span className="font-semibold text-emerald-700">
            {(chart.indicators.savingsRate * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {chart && <DashboardCharts monthly={chart.series} byCard={byCard} />}
    </div>
  );
}
