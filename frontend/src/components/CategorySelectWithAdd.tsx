"use client";

import { useEffect, useId, useState } from "react";
import { apiJson } from "@/lib/api";

export type CategoryOption = { id: string; name: string };

type EmptyOption = { value: string; label: string };

type Props = {
  label: string;
  categoryType: "income" | "expense";
  value: string;
  onChange: (categoryId: string) => void;
  categories: CategoryOption[];
  reloadCategories: () => Promise<void>;
  /** Quando definido, primeira opção do select (ex.: filtro "Todas"). */
  emptyOption?: EmptyOption;
  selectRequired?: boolean;
};

export function CategorySelectWithAdd({
  label,
  categoryType,
  value,
  onChange,
  categories,
  reloadCategories,
  emptyOption,
  selectRequired,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openDialog = () => {
    setDialogError(null);
    setNewName("");
    setOpen(true);
  };

  const submitNew = async () => {
    setDialogError(null);
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setDialogError("Use pelo menos 2 caracteres no nome.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiJson<{ id: string; name: string }>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, type: categoryType }),
      });
      await reloadCategories();
      onChange(created.id);
      setNewName("");
      setOpen(false);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 flex gap-2">
        <select
          required={selectRequired}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm [color-scheme:light] min-h-[2.75rem]"
        >
          {emptyOption ? (
            <option value={emptyOption.value}>{emptyOption.label}</option>
          ) : null}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openDialog}
          title="Nova categoria"
          aria-label="Adicionar nova categoria"
          className="inline-flex h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg border border-ocean-200 bg-ocean-50 text-lg font-bold leading-none text-ocean-700 shadow-sm transition hover:bg-ocean-100 active:bg-ocean-200"
        >
          +
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Nova categoria ({categoryType === "income" ? "receita" : "despesa"})
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Opcional: crie só quando precisar. Os nomes padrão continuam disponíveis.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="new-category-name" className="text-sm font-medium text-slate-700">
                  Nome
                </label>
                <input
                  id="new-category-name"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitNew();
                    }
                  }}
                  placeholder="Ex.: Moradia"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  maxLength={120}
                />
              </div>
              {dialogError ? <p className="text-sm text-red-600">{dialogError}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submitNew()}
                  className="rounded-lg bg-gradient-to-r from-ocean-600 to-lagoon-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
