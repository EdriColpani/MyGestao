import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";

export const cardsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/cards", { preHandler: requireAuth }, async (request) => {
    return prisma.card.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/cards", { preHandler: requireAuth }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      invoiceDueDay: z.number().int().min(1).max(31),
      limitAmount: z.number().positive(),
      brand: z.string().min(2),
      issuingBank: z.string().min(2),
    });
    const body = bodySchema.parse(request.body);

    const card = await prisma.card.create({
      data: {
        userId: request.user.sub,
        name: body.name,
        invoiceDueDay: body.invoiceDueDay,
        limitAmount: body.limitAmount,
        brand: body.brand,
        issuingBank: body.issuingBank,
      },
    });

    return reply.status(201).send(card);
  });

  app.put("/cards/:id", { preHandler: requireAuth }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      name: z.string().min(2),
      invoiceDueDay: z.number().int().min(1).max(31),
      limitAmount: z.number().positive(),
      brand: z.string().min(2),
      issuingBank: z.string().min(2),
    });
    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const updated = await prisma.card.updateMany({
      where: { id: params.id, userId: request.user.sub },
      data: {
        name: body.name,
        invoiceDueDay: body.invoiceDueDay,
        limitAmount: body.limitAmount,
        brand: body.brand,
        issuingBank: body.issuingBank,
      },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: "Cartao nao encontrado" });
    }

    return prisma.card.findUniqueOrThrow({ where: { id: params.id } });
  });

  app.delete("/cards/:id", { preHandler: requireAuth }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const deleted = await prisma.card.deleteMany({
      where: { id: params.id, userId: request.user.sub },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: "Cartao nao encontrado" });
    }

    return reply.status(204).send();
  });
};
