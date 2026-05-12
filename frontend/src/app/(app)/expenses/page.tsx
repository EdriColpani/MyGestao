"use client";

import { FormEvent, useEffect, useState } from "react";
import { CategorySelectWithAdd } from "@/components/CategorySelectWithAdd";
import { apiJson } from "@/lib/api";
import { currentYearMonth, rollingYearMonths, todayISODate } from "@/lib/month";
import { formatBRL, parseDecimalInput } from "@/lib/money";

type Category = { id: string; name: string };
type Card = { id: string; name: string };
type Purchase = {
  id: string;
  referenceMonth: string;
  expenseDescription: string;
  totalAmount: string | number;
  installments: number;
  purchaseDate: string;
  storeName: string;
  card: { name: string };
  category: { name: string };
};

export default function ExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [referenceMonth, setReferenceMonth] = useState(currentYearMonth());
  const [expenseDescription, setExpenseDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState(todayISODate());
  const [storeName, setStoreName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [cardId, setCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadMeta = async () => {
    const [cats, cs] = await Promise.all([
      apiJson<Category[]>("/categories?type=expense"),
      apiJson<Card[]>("/cards"),
    ]);
    setCategories(cats);
    setCards(cs);
    if (!categoryId && cats[0]) setCategoryId(cats[0].id);
    if (!cardId && cs[0]) setCardId(cs[0].id);
  };

  useEffect(() => {
    loadMeta().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  const loadPurchases = async () => {
    const data = await apiJson<Purchase[]>("/expenses/purchases");
    setPurchases(data);
  };

  useEffect(() => {
    loadPurchases().catch(() => {
      /* ignorado: erro já tratado no submit */
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const total = parseDecimalInput(totalAmount);
    const inst = Number(installments);
    if (!cardId || !categoryId || Number.isNaN(total) || total <= 0 || !Number.isInteger(inst) || inst < 1) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    try {
      await apiJson("/expenses/purchases", {
        method: "POST",
        body: JSON.stringify({
          referenceMonth,
          expenseDescription,
          totalAmount: total,
          installments: inst,
          purchaseDate,
          storeName,
          productDescription,
          cardId,
          categoryId,
        }),
      });
      setMsg("Despesa salva. Parcelas geradas automaticamente.");
      setTotalAmount("");
      setExpenseDescription("");
      setStoreName("");
      setProductDescription("");
      setInstallments("1");
      await loadPurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  };

  const months = rollingYearMonths(18);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cadastro de despesas</h1>
        <p className="text-sm text-slate-600 sm:text-base">Todos os campos são obrigatórios. Compras parceladas geram lançamentos mensais.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 md:grid-cols-2"
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Mês (referência)</label>
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
        <div>
          <label className="text-sm font-medium text-slate-700">Cartão</label>
          <select
            required
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <CategorySelectWithAdd
          label="Categoria"
          categoryType="expense"
          value={categoryId}
          onChange={setCategoryId}
          categories={categories}
          selectRequired
          reloadCategories={async () => {
            const cats = await apiJson<Category[]>("/categories?type=expense");
            setCategories(cats);
          }}
        />
        <div>
          <label className="text-sm font-medium text-slate-700">Data da compra</label>
          <input
            required
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Descrição da despesa</label>
          <input
            required
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Valor total (R$)</label>
          <input
            required
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Número de parcelas</label>
          <input
            required
            type="number"
            min={1}
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Nome da loja</label>
          <input
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Descrição do produto</label>
          <textarea
            required
            rows={3}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
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
            Salvar despesa
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Últimas compras</h2>
        <div className="mt-3 overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-4 py-3">Mês ref.</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Cartão</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Parcelas</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma compra registrada ainda.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{p.referenceMonth.slice(0, 7)}</td>
                    <td className="px-4 py-3">{p.expenseDescription}</td>
                    <td className="px-4 py-3">{p.storeName}</td>
                    <td className="px-4 py-3">{p.card.name}</td>
                    <td className="px-4 py-3">{p.category.name}</td>
                    <td className="px-4 py-3">{p.installments}x</td>
                    <td className="px-4 py-3 font-medium">{formatBRL(Number(p.totalAmount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
