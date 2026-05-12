export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function parseDecimalInput(value: string): number {
  const n = Number(value.replace(",", "."));
  if (Number.isNaN(n)) return NaN;
  return n;
}
