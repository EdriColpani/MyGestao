"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { formatBRL, parseDecimalInput } from "@/lib/money";

type Card = {
  id: string;
  name: string;
  invoiceDueDay: number;
  limitAmount: string | number;
  brand: string;
  issuingBank: string;
};

export default function CardsPage() {
  const [list, setList] = useState<Card[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [invoiceDueDay, setInvoiceDueDay] = useState("10");
  const [limitAmount, setLimitAmount] = useState("");
  const [brand, setBrand] = useState("");
  const [issuingBank, setIssuingBank] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const data = await apiJson<Card[]>("/cards");
    setList(data);
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setInvoiceDueDay("10");
    setLimitAmount("");
    setBrand("");
    setIssuingBank("");
  };

  const startEdit = (c: Card) => {
    setEditingId(c.id);
    setName(c.name);
    setInvoiceDueDay(String(c.invoiceDueDay));
    setLimitAmount(String(c.limitAmount));
    setBrand(c.brand);
    setIssuingBank(c.issuingBank);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const limit = parseDecimalInput(limitAmount);
    const due = Number(invoiceDueDay);
    if (!name || Number.isNaN(limit) || limit <= 0 || !brand || !issuingBank || due < 1 || due > 31) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    try {
      if (editingId) {
        await apiJson(`/cards/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            invoiceDueDay: due,
            limitAmount: limit,
            brand,
            issuingBank,
          }),
        });
        setMsg("Cartão atualizado.");
      } else {
        await apiJson("/cards", {
          method: "POST",
          body: JSON.stringify({
            name,
            invoiceDueDay: due,
            limitAmount: limit,
            brand,
            issuingBank,
          }),
        });
        setMsg("Cartão criado.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este cartão?")) return;
    setError(null);
    try {
      await apiJson(`/cards/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cartões</h1>
        <p className="text-sm text-slate-600 sm:text-base">Cadastre nome, vencimento, limite, bandeira e banco emissor.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur md:grid-cols-2"
      >
        <div className="md:col-span-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editingId ? "Editar cartão" : "Novo cartão"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-ocean-700 underline"
            >
              Cancelar edição
            </button>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Nome do cartão</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Dia vencimento da fatura</label>
          <input
            required
            type="number"
            min={1}
            max={31}
            value={invoiceDueDay}
            onChange={(e) => setInvoiceDueDay(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Limite (R$)</label>
          <input
            required
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Bandeira</label>
          <input
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Banco emissor</label>
          <input
            required
            value={issuingBank}
            onChange={(e) => setIssuingBank(e.target.value)}
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
            {editingId ? "Salvar alterações" : "Adicionar cartão"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto overflow-touch-x rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Limite</th>
              <th className="px-4 py-3">Bandeira</th>
              <th className="px-4 py-3">Banco</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">Dia {c.invoiceDueDay}</td>
                <td className="px-4 py-3">{formatBRL(Number(c.limitAmount))}</td>
                <td className="px-4 py-3">{c.brand}</td>
                <td className="px-4 py-3">{c.issuingBank}</td>
                <td className="px-4 py-3 space-x-3">
                  <button type="button" className="text-ocean-700 underline" onClick={() => startEdit(c)}>
                    Editar
                  </button>
                  <button type="button" className="text-red-600 underline" onClick={() => onDelete(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
