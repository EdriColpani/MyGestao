import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";
import { toMonthStart } from "../../shared/date";

export const incomesRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/incomes", { preHandler: requireAuth }, async (request) => {
    return prisma.monthlyIncome.findMany({
      where: { userId: request.user.sub },
      orderBy: { referenceMonth: "desc" },
    });
  });

  app.post("/incomes", { preHandler: requireAuth }, async (request, reply) => {
    const bodySchema = z.object({
      categoryId: z.string().uuid(),
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      description: z.string().min(2),
      amount: z.number().positive(),
      receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const body = bodySchema.parse(request.body);

    const income = await prisma.monthlyIncome.create({
      data: {
        userId: request.user.sub,
        categoryId: body.categoryId,
        referenceMonth: toMonthStart(body.referenceMonth),
        description: body.description,
        amount: body.amount,
        receivedDate: new Date(body.receivedDate),
      },
    });

    await prisma.cashFlow.create({
      data: {
        userId: request.user.sub,
        movementType: "income",
        originType: "monthly_income",
        originId: income.id,
        referenceMonth: income.referenceMonth,
        movementDate: income.receivedDate,
        amount: income.amount,
        description: income.description,
      },
    });

    return reply.status(201).send(income);
  });
};
