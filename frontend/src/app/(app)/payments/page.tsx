"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { formControlClass } from "@/lib/form-styles";
import { currentYearMonth, rollingYearMonths, todayISODate } from "@/lib/month";
import { formatBRL, parseDecimalInput } from "@/lib/money";

type Card = { id: string; name: string };
type Installment = {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: string | number;
  status: string;
  purchase: { expenseDescription: string; storeName: string; dueDate?: string | null };
};

export default function PaymentsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardId, setCardId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(currentYearMonth());
  const [rows, setRows] = useState<Installment[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [interestInput, setInterestInput] = useState("");
  const [lateFeeInput, setLateFeeInput] = useState("");
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
      const interestAmount = interestInput.trim() === "" ? 0 : parseDecimalInput(interestInput);
      const lateFeeAmount = lateFeeInput.trim() === "" ? 0 : parseDecimalInput(lateFeeInput);
      if (interestAmount < 0 || lateFeeAmount < 0 || Number.isNaN(interestAmount) || Number.isNaN(lateFeeAmount)) {
        setError("Juros e mora devem ser valores numéricos válidos (ex.: 1,50 ou 0).");
        return;
      }
      await apiJson("/payments/invoices/process", {
        method: "POST",
        body: JSON.stringify({
          cardId,
          referenceMonth,
          paymentDate,
          installmentIds: selectedIds,
          interestAmount,
          lateFeeAmount,
        }),
      });
      setMsg("Pagamento registrado e fluxo de caixa atualizado.");
      setInterestInput("");
      setLateFeeInput("");
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

      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Mês</label>
            <select
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
          <div>
            <label className="text-sm font-medium text-slate-700">Data do pagamento</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={`mt-1 ${formControlClass}`}
            />
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Juros (R$)</label>
            <p className="mt-0.5 text-xs text-slate-500">Opcional, quando houver cobrança de juros por atraso.</p>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              className={`mt-1 ${formControlClass}`}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Mora (R$)</label>
            <p className="mt-0.5 text-xs text-slate-500">Opcional, multa / mora por atraso na parcela.</p>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={lateFeeInput}
              onChange={(e) => setLateFeeInput(e.target.value)}
              className={`mt-1 ${formControlClass}`}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
            Nenhuma parcela pendente para este mês e cartão.
          </p>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-ocean-600 focus:ring-ocean-500"
                    checked={!!selected[r.id]}
                    onChange={() => toggle(r.id)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Parcela {r.installmentNumber}/{r.totalInstallments}
                    </span>
                    <span className="mt-1 block text-sm text-slate-700">{r.purchase.expenseDescription}</span>
                    <span className="mt-1 block text-xs text-slate-500">{r.purchase.storeName}</span>
                    {r.purchase.dueDate ? (
                      <span className="mt-1 block text-xs font-medium text-ocean-800">
                        Venc. compra: {r.purchase.dueDate.slice(0, 10)}
                      </span>
                    ) : null}
                  </span>
                </label>
                <span className="shrink-0 text-base font-semibold text-ocean-800">
                  {formatBRL(Number(r.amount))}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
            <tr>
              <th className="px-4 py-3">Pagar</th>
              <th className="px-4 py-3">Parcela</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Venc.</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
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
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {r.purchase.dueDate ? r.purchase.dueDate.slice(0, 10) : "—"}
                  </td>
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
          className="w-full min-h-[2.75rem] rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 px-6 py-3 text-base font-semibold text-white shadow disabled:opacity-50 md:w-auto md:min-h-0"
        >
          Processar pagamento
        </button>
      </form>
    </div>
  );
}
