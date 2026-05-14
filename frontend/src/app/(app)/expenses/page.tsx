"use client";

import { FormEvent, useEffect, useState } from "react";
import { CategorySelectWithAdd } from "@/components/CategorySelectWithAdd";
import { apiJson } from "@/lib/api";
import { formControlClass } from "@/lib/form-styles";
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
  dueDate: string | null;
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
  const [dueDate, setDueDate] = useState(todayISODate());
  const [storeName, setStoreName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [cardId, setCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (saving) return;
    setError(null);
    setMsg(null);
    const total = parseDecimalInput(totalAmount);
    const inst = Number(installments);
    if (!cardId || !categoryId || Number.isNaN(total) || total <= 0 || !Number.isInteger(inst) || inst < 1) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    setSaving(true);
    try {
      await apiJson("/expenses/purchases", {
        method: "POST",
        body: JSON.stringify({
          referenceMonth,
          expenseDescription,
          totalAmount: total,
          installments: inst,
          purchaseDate,
          dueDate,
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
    } finally {
      setSaving(false);
    }
  };

  const deletePurchase = async (id: string) => {
    if (
      !window.confirm(
        "Excluir esta compra e todas as parcelas pendentes? Nao e possivel desfazer.",
      )
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    setDeletingId(id);
    try {
      await apiJson<void>(`/expenses/purchases/${id}`, { method: "DELETE" });
      setMsg("Compra excluida.");
      await loadPurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeletingId(null);
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
        aria-busy={saving}
        className={`grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 md:grid-cols-2 ${
          saving ? "cursor-wait" : ""
        }`}
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Mês (referência)</label>
          <select
            required
            disabled={saving}
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className={`mt-1 ${formControlClass}`}
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
            disabled={saving}
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className={`mt-1 ${formControlClass}`}
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
          disabled={saving}
          reloadCategories={async () => {
            const cats = await apiJson<Category[]>("/categories?type=expense");
            setCategories(cats);
          }}
        />
        <div>
          <label className="text-sm font-medium text-slate-700">Data da compra</label>
          <input
            required
            disabled={saving}
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Data de vencimento</label>
          <input
            required
            disabled={saving}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
          <p className="mt-1 text-xs text-slate-500">Vencimento da cobrança ou da parcela na fatura.</p>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Descrição da despesa</label>
          <input
            required
            disabled={saving}
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Valor total (R$)</label>
          <input
            required
            disabled={saving}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Número de parcelas</label>
          <input
            required
            disabled={saving}
            type="number"
            min={1}
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Nome da loja</label>
          <input
            required
            disabled={saving}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className={`mt-1 ${formControlClass}`}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Descrição do produto</label>
          <textarea
            required
            disabled={saving}
            rows={3}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className={`mt-1 min-h-[5.5rem] ${formControlClass}`}
          />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="md:col-span-2 text-sm text-emerald-700">{msg}</p>}
        <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[2.75rem] min-w-[10rem] items-center justify-center rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 px-5 py-2.5 text-base font-semibold text-white shadow disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
                A guardar…
              </span>
            ) : (
              "Salvar despesa"
            )}
          </button>
          {saving && (
            <span className="text-sm text-slate-600">Aguarde, a gravar a despesa…</span>
          )}
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Últimas compras</h2>

        <div className="mt-3 space-y-3 md:hidden">
          {purchases.length === 0 ? (
            <p className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
              Nenhuma compra registrada ainda.
            </p>
          ) : (
            purchases.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {p.referenceMonth.slice(0, 7)}
                  </p>
                  <p className="text-base font-semibold text-ocean-800">{formatBRL(Number(p.totalAmount))}</p>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{p.expenseDescription}</p>
                <p className="mt-1 text-sm text-slate-600">{p.storeName}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{p.card.name}</span>
                  <span>·</span>
                  <span>{p.category.name}</span>
                  <span>·</span>
                  <span>{p.installments}x</span>
                </div>
                {p.dueDate && (
                  <p className="mt-2 text-xs font-medium text-ocean-800">
                    Venc.: {p.dueDate.slice(0, 10).split("-").reverse().join("/")}
                  </p>
                )}
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={saving || deletingId !== null}
                    onClick={() => void deletePurchase(p.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === p.id ? "A excluir…" : "Excluir"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-3 hidden overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-4 py-3">Mês ref.</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Cartão</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Parcelas</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma compra registrada ainda.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{p.referenceMonth.slice(0, 7)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {p.dueDate ? p.dueDate.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3">{p.expenseDescription}</td>
                    <td className="px-4 py-3">{p.storeName}</td>
                    <td className="px-4 py-3">{p.card.name}</td>
                    <td className="px-4 py-3">{p.category.name}</td>
                    <td className="px-4 py-3">{p.installments}x</td>
                    <td className="px-4 py-3 font-medium">{formatBRL(Number(p.totalAmount))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={saving || deletingId !== null}
                        onClick={() => void deletePurchase(p.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === p.id ? "…" : "Excluir"}
                      </button>
                    </td>
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
