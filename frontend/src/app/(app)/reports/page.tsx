"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategorySelectWithAdd } from "@/components/CategorySelectWithAdd";
import { apiJson } from "@/lib/api";
import { currentYearMonth } from "@/lib/month";
import { formatBRL } from "@/lib/money";

type Card = { id: string; name: string };
type Category = { id: string; name: string; type: string };

type PaymentRow = {
  id: string;
  referenceMonth: string;
  paidTotalAmount: string | number;
  paymentDate: string;
  card: { name: string; brand: string };
};

type InstallmentRow = {
  id: string;
  referenceMonth: string;
  amount: string | number;
  status: string;
  card: { name: string };
  purchase: { expenseDescription: string; category: { name: string } };
};

export default function ReportsPage() {
  const [fromMonth, setFromMonth] = useState(currentYearMonth());
  const [toMonth, setToMonth] = useState(currentYearMonth());
  const [cardId, setCardId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<"" | "pending" | "paid">("");

  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [chart, setChart] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiJson<Card[]>("/cards"), apiJson<Category[]>("/categories?type=expense")])
      .then(([c, cat]) => {
        setCards(c);
        setCategories(cat);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  const load = async () => {
    setError(null);
    try {
      const payUrl = `/reports/payments?fromMonth=${fromMonth}&toMonth=${toMonth}${
        cardId ? `&cardId=${cardId}` : ""
      }`;
      const instUrl = `/reports/installments?fromMonth=${fromMonth}&toMonth=${toMonth}${
        cardId ? `&cardId=${cardId}` : ""
      }${categoryId ? `&categoryId=${categoryId}` : ""}${status ? `&status=${status}` : ""}`;
      const [p, ins, ch] = await Promise.all([
        apiJson<PaymentRow[]>(payUrl),
        apiJson<InstallmentRow[]>(instUrl),
        apiJson<{ series: { month: string; income: number; expense: number }[] }>(
          `/reports/charts/monthly?months=12`,
        ),
      ]);
      setPayments(p);
      setInstallments(ins);
      setChart(ch.series);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  useEffect(() => {
    void load();
  }, [fromMonth, toMonth, cardId, categoryId, status]);

  const catTotals = installments.reduce<Record<string, number>>((acc, row) => {
    const name = row.purchase.category.name;
    acc[name] = (acc[name] ?? 0) + Number(row.amount);
    return acc;
  }, {});
  const catChart = Object.entries(catTotals).map(([name, total]) => ({ name, total }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Relatórios financeiros</h1>
        <p className="text-sm text-slate-600 sm:text-base">Pagamentos concluídos, parcelas e gráficos com filtros.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="reports-from-month" className="text-sm font-medium text-slate-700">
            Mês inicial
          </label>
          <input
            id="reports-from-month"
            type="month"
            min="2000-01"
            max="2100-12"
            value={fromMonth}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setFromMonth(v);
              if (v > toMonth) setToMonth(v);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">Inclui todo o mês de referência (cartão / parcelas).</p>
        </div>
        <div>
          <label htmlFor="reports-to-month" className="text-sm font-medium text-slate-700">
            Mês final
          </label>
          <input
            id="reports-to-month"
            type="month"
            min="2000-01"
            max="2100-12"
            value={toMonth}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setToMonth(v);
              if (v < fromMonth) setFromMonth(v);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">Até ao fim deste mês (inclusive).</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Cartão</label>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">Todos</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <CategorySelectWithAdd
          label="Categoria (parcelas)"
          categoryType="expense"
          value={categoryId}
          onChange={setCategoryId}
          categories={categories}
          emptyOption={{ value: "", label: "Todas" }}
          reloadCategories={async () => {
            const cat = await apiJson<Category[]>("/categories?type=expense");
            setCategories(cat);
          }}
        />
        <div>
          <label className="text-sm font-medium text-slate-700">Status (parcelas)</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="paid">Pagas</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm sm:p-4">
          <h3 className="text-sm font-semibold text-slate-800">Receitas x despesas (12 meses)</h3>
          <div className="mt-3 h-[200px] w-full min-w-0 sm:mt-4 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#0e9f6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm sm:p-4">
          <h3 className="text-sm font-semibold text-slate-800">Despesas por categoria (grid atual)</h3>
          <div className="mt-3 h-[200px] w-full min-w-0 sm:mt-4 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Bar dataKey="total" name="Total" fill="#0f4c81" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pagamentos concluídos</h2>
        <div className="mt-3 overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cartão</th>
                <th className="px-4 py-3">Mês ref.</th>
                <th className="px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{p.paymentDate.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {p.card.name}{" "}
                    <span className="text-slate-500">({p.card.brand})</span>
                  </td>
                  <td className="px-4 py-3">{p.referenceMonth.slice(0, 7)}</td>
                  <td className="px-4 py-3 font-medium">{formatBRL(Number(p.paidTotalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Parcelas (pagas e pendentes)</h2>
        <div className="mt-3 overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Cartão</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{r.referenceMonth.slice(0, 7)}</td>
                  <td className="px-4 py-3">{r.card.name}</td>
                  <td className="px-4 py-3">{r.purchase.category.name}</td>
                  <td className="px-4 py-3">{r.purchase.expenseDescription}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "paid"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
                          : "rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"
                      }
                    >
                      {r.status === "paid" ? "Paga" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBRL(Number(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
