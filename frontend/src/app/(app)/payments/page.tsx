"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { currentYearMonth, rollingYearMonths, todayISODate } from "@/lib/month";
import { formatBRL } from "@/lib/money";

type Card = { id: string; name: string };
type Installment = {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: string | number;
  status: string;
  purchase: { expenseDescription: string; storeName: string };
};

export default function PaymentsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardId, setCardId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(currentYearMonth());
  const [rows, setRows] = useState<Installment[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Card[]>("/cards")
      .then((c) => {
        setCards(c);
        if (c[0]) setCardId(c[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  const loadInstallments = async () => {
    if (!cardId) return;
    setError(null);
    try {
      const data = await apiJson<Installment[]>(
        `/expenses/installments?referenceMonth=${referenceMonth}&cardId=${cardId}&status=pending`,
      );
      setRows(data);
      const init: Record<string, boolean> = {};
      data.forEach((r) => {
        init[r.id] = true;
      });
      setSelected(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  };

  useEffect(() => {
    void loadInstallments();
  }, [cardId, referenceMonth]);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const totalSelected = rows
    .filter((r) => selected[r.id])
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const onPay = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (selectedIds.length === 0) {
      setError("Selecione ao menos uma parcela.");
      return;
    }
    setError(null);
    try {
      await apiJson("/payments/invoices/process", {
        method: "POST",
        body: JSON.stringify({
          cardId,
          referenceMonth,
          paymentDate,
          installmentIds: selectedIds,
        }),
      });
      setMsg("Pagamento registrado e fluxo de caixa atualizado.");
      await loadInstallments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no pagamento");
    }
  };

  const months = rollingYearMonths(18);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Pagamento mensal de despesas</h1>
        <p className="text-sm text-slate-600 sm:text-base">Filtre por mês e cartão, selecione parcelas e confirme o pagamento.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Mês</label>
          <select
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
        <div>
          <label className="text-sm font-medium text-slate-700">Data do pagamento</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
            <tr>
              <th className="px-4 py-3">Pagar</th>
              <th className="px-4 py-3">Parcela</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhuma parcela pendente para este mês e cartão.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {r.installmentNumber}/{r.totalInstallments}
                  </td>
                  <td className="px-4 py-3">{r.purchase.expenseDescription}</td>
                  <td className="px-4 py-3">{r.purchase.storeName}</td>
                  <td className="px-4 py-3 font-medium">{formatBRL(Number(r.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onPay}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-sm text-slate-600">Total selecionado</p>
          <p className="text-2xl font-semibold text-ocean-800">{formatBRL(totalSelected)}</p>
        </div>
        <button
          type="submit"
          disabled={rows.length === 0 || selectedIds.length === 0}
          className="rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 px-6 py-3 font-semibold text-white shadow disabled:opacity-50"
        >
          Processar pagamento
        </button>
      </form>
    </div>
  );
}
