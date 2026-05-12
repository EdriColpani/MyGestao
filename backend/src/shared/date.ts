export const toMonthStart = (value: string): Date => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Mes invalido. Use formato YYYY-MM");
  }

  return new Date(Date.UTC(year, month - 1, 1));
};

/** Ultimo dia do mes (UTC) para filtros inclusive com campos DATE */
export const toMonthEnd = (value: string): Date => {
  const start = toMonthStart(value);
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return new Date(next.getTime() - 86400000);
};
