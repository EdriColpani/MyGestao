export const toMonthStart = (value: string): Date => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Mes invalido. Use formato YYYY-MM");
  }
  return new Date(Date.UTC(year, month - 1, 1));
};
