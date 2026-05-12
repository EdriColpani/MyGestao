"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/money";

type MonthlyPoint = { month: string; income: number; expense: number };
type ByCard = { cardName: string | null; totalAmount: number };

export function DashboardCharts({
  monthly,
  byCard,
}: {
  monthly: MonthlyPoint[];
  byCard: ByCard[];
}) {
  const cardData = byCard.map((c) => ({
    name: c.cardName ?? "Cartão",
    total: c.totalAmount,
  }));

  const monthTick = (v: string) => {
    const [y, m] = String(v).split("-");
    return m && y ? `${m}/${y.slice(2)}` : v;
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
        <h3 className="text-sm font-semibold text-slate-800">Receitas x despesas (mensal)</h3>
        <div className="mt-3 h-[220px] w-full min-w-0 sm:mt-4 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ left: 0, right: 8, top: 4, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                tickFormatter={monthTick}
                interval="preserveStartEnd"
                angle={-25}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip
                formatter={(value) => formatBRL(Number(value))}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <Legend />
              <Line type="monotone" dataKey="income" name="Receitas" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="expense"
                name="Despesas (fluxo)"
                stroke="#0e9f6e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
        <h3 className="text-sm font-semibold text-slate-800">Despesas por cartão (período filtrado)</h3>
        <div className="mt-3 h-[220px] w-full min-w-0 sm:mt-4 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cardData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Bar dataKey="total" name="Total" fill="#0f4c81" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
