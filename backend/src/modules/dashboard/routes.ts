import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";
import { toMonthStart } from "../../shared/date";

export const dashboardRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/dashboard/summary", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
    });
    const query = querySchema.parse(request.query);
    const month = toMonthStart(query.referenceMonth);

    const [incomeAgg, expenseAgg, pendingAgg] = await Promise.all([
      prisma.monthlyIncome.aggregate({
        where: { userId: request.user.sub, referenceMonth: month },
        _sum: { amount: true },
      }),
      prisma.cashFlow.aggregate({
        where: {
          userId: request.user.sub,
          referenceMonth: month,
          movementType: "expense",
        },
        _sum: { amount: true },
      }),
      prisma.expenseInstallment.aggregate({
        where: {
          userId: request.user.sub,
          referenceMonth: month,
          status: "pending",
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);
    const pendingAmount = Number(pendingAgg._sum.amount ?? 0);

    return {
      referenceMonth: query.referenceMonth,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pendingAmount,
    };
  });
};
