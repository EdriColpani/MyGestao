import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";
import { toMonthStart } from "../../shared/date";

export const reportsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/reports/payments", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
      toMonth: z.string().regex(/^\d{4}-\d{2}$/),
      cardId: z.string().uuid().optional(),
    });
    const query = querySchema.parse(request.query);
    const from = toMonthStart(query.fromMonth);
    const to = toMonthStart(query.toMonth);

    return prisma.cardInvoicePayment.findMany({
      where: {
        userId: request.user.sub,
        referenceMonth: { gte: from, lte: to },
        ...(query.cardId ? { cardId: query.cardId } : {}),
      },
      include: {
        card: true,
        items: {
          include: {
            installment: {
              include: {
                purchase: {
                  include: { category: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    });
  });

  app.get("/reports/installments", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
      toMonth: z.string().regex(/^\d{4}-\d{2}$/),
      cardId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      status: z.enum(["pending", "paid"]).optional(),
    });
    const query = querySchema.parse(request.query);
    const from = toMonthStart(query.fromMonth);
    const to = toMonthStart(query.toMonth);

    return prisma.expenseInstallment.findMany({
      where: {
        userId: request.user.sub,
        referenceMonth: { gte: from, lte: to },
        ...(query.cardId ? { cardId: query.cardId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.categoryId
          ? { purchase: { categoryId: query.categoryId } }
          : {}),
      },
      include: {
        card: true,
        purchase: {
          include: { category: true },
        },
      },
      orderBy: [{ referenceMonth: "asc" }, { installmentNumber: "asc" }],
    });
  });

  app.get("/reports/charts/monthly", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      months: z.coerce.number().int().min(3).max(24).default(6),
    });
    const query = querySchema.parse(request.query);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1), 1));

    const [incomeGroups, expenseGroups] = await Promise.all([
      prisma.monthlyIncome.groupBy({
        by: ["referenceMonth"],
        where: {
          userId: request.user.sub,
          referenceMonth: { gte: start },
        },
        _sum: { amount: true },
      }),
      prisma.cashFlow.groupBy({
        by: ["referenceMonth"],
        where: {
          userId: request.user.sub,
          movementType: "expense",
          referenceMonth: { gte: start },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

    const labels: string[] = [];
    for (let i = 0; i < query.months; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1 - i), 1));
      labels.push(monthKey(d));
    }

    const incomeMap = new Map(
      incomeGroups.map((g) => [monthKey(g.referenceMonth), Number(g._sum.amount ?? 0)]),
    );
    const expenseMap = new Map(
      expenseGroups.map((g) => [monthKey(g.referenceMonth), Number(g._sum.amount ?? 0)]),
    );

    const series = labels.map((label) => ({
      month: label,
      income: incomeMap.get(label) ?? 0,
      expense: expenseMap.get(label) ?? 0,
    }));

    const totalIncome = series.reduce((a, b) => a + b.income, 0);
    const totalExpense = series.reduce((a, b) => a + b.expense, 0);

    return {
      series,
      indicators: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0,
      },
    };
  });

  app.get("/reports/summary/by-card", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
      toMonth: z.string().regex(/^\d{4}-\d{2}$/),
    });
    const query = querySchema.parse(request.query);
    const from = toMonthStart(query.fromMonth);
    const to = toMonthStart(query.toMonth);

    const rows = await prisma.expenseInstallment.groupBy({
      by: ["cardId"],
      where: {
        userId: request.user.sub,
        referenceMonth: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });

    const cards = await prisma.card.findMany({
      where: { userId: request.user.sub, id: { in: rows.map((r) => r.cardId) } },
    });
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    return rows.map((r) => ({
      cardId: r.cardId,
      cardName: cardMap.get(r.cardId)?.name ?? null,
      totalAmount: Number(r._sum.amount ?? 0),
    }));
  });
};
