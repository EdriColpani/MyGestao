import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";
import { toMonthStart } from "../../shared/date";

export const expensesRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/expenses/purchases", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    });
    const query = querySchema.parse(request.query);

    return prisma.expensePurchase.findMany({
      where: {
        userId: request.user.sub,
        ...(query.referenceMonth
          ? { referenceMonth: toMonthStart(query.referenceMonth) }
          : {}),
      },
      include: {
        card: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.post("/expenses/purchases", { preHandler: requireAuth }, async (request, reply) => {
    const bodySchema = z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      expenseDescription: z.string().min(2),
      totalAmount: z.number().positive(),
      installments: z.number().int().min(1),
      purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      storeName: z.string().min(2),
      productDescription: z.string().min(2),
      cardId: z.string().uuid(),
      categoryId: z.string().uuid(),
    });
    const body = bodySchema.parse(request.body);

    const [card, category] = await Promise.all([
      prisma.card.findFirst({ where: { id: body.cardId, userId: request.user.sub } }),
      prisma.category.findFirst({
        where: { id: body.categoryId, userId: request.user.sub, type: "expense" },
      }),
    ]);

    if (!card || !category) {
      return reply.status(400).send({ message: "Cartao ou categoria invalido para o usuario" });
    }

    const purchase = await prisma.expensePurchase.create({
      data: {
        userId: request.user.sub,
        cardId: body.cardId,
        categoryId: body.categoryId,
        referenceMonth: toMonthStart(body.referenceMonth),
        expenseDescription: body.expenseDescription,
        totalAmount: body.totalAmount,
        installments: body.installments,
        purchaseDate: new Date(body.purchaseDate),
        storeName: body.storeName,
        productDescription: body.productDescription,
      },
    });

    return reply.status(201).send(purchase);
  });

  app.get("/expenses/installments", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      cardId: z.string().uuid(),
      status: z.enum(["pending", "paid"]).optional(),
    });
    const query = querySchema.parse(request.query);

    return prisma.expenseInstallment.findMany({
      where: {
        userId: request.user.sub,
        cardId: query.cardId,
        referenceMonth: toMonthStart(query.referenceMonth),
        status: query.status,
      },
      include: {
        purchase: {
          select: {
            expenseDescription: true,
            storeName: true,
            productDescription: true,
          },
        },
      },
      orderBy: { installmentNumber: "asc" },
    });
  });
};
