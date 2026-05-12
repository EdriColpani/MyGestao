"use client";

import { FormEvent, useEffect, useState } from "react";
import { CategorySelectWithAdd } from "@/components/CategorySelectWithAdd";
import { apiJson } from "@/lib/api";
import { currentYearMonth, rollingYearMonths, todayISODate } from "@/lib/month";
import { formatBRL, parseDecimalInput } from "@/lib/money";

type Category = { id: string; name: string; type: string };
type Income = {
  id: string;
  referenceMonth: string;
  description: string;
  amount: string | number;
  receivedDate: string;
  categoryId: string;
};

export default function IncomesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Income[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(currentYearMonth());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState(todayISODate());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [cats, inc] = await Promise.all([
      apiJson<Category[]>("/categories?type=income"),
      apiJson<Income[]>("/incomes"),
    ]);
    setCategories(cats);
    setList(inc);
    if (!categoryId && cats[0]) setCategoryId(cats[0].id);
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const value = parseDecimalInput(amount);
    if (!categoryId || Number.isNaN(value) || value <= 0) {
      setError("Preencha categoria e valor válidos");
      return;
    }
    try {
      await apiJson("/incomes", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          referenceMonth,
          description,
          amount: value,
          receivedDate,
        }),
      });
      setAmount("");
      setDescription("");
      setMsg("Receita registrada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  };

  const months = rollingYearMonths(18);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Receitas mensais</h1>
        <p className="text-sm text-slate-600 sm:text-base">Lançe entradas por mês e categoria</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Nova receita</h2>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Mês</label>
          <select
            required
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <CategorySelectWithAdd
          label="Categoria"
          categoryType="income"
          value={categoryId}
          onChange={setCategoryId}
          categories={categories}
          selectRequired
          reloadCategories={async () => {
            const cats = await apiJson<Category[]>("/categories?type=income");
            setCategories(cats);
          }}
        />
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Descrição</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
          <input
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Data recebimento</label>
          <input
            required
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="md:col-span-2 text-sm text-emerald-700">{msg}</p>}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 px-5 py-2.5 font-semibold text-white shadow"
          >
            Salvar receita
          </button>
        </div>
      </form>

      <div className="overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
            <tr>
              <th className="px-4 py-3">Mês</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Recebido em</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="px-4 py-3">{row.referenceMonth.slice(0, 7)}</td>
                <td className="px-4 py-3">{row.description}</td>
                <td className="px-4 py-3 font-medium">{formatBRL(Number(row.amount))}</td>
                <td className="px-4 py-3">{row.receivedDate.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
