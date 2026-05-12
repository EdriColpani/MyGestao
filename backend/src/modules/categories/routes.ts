import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";

export const categoriesRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/categories", { preHandler: requireAuth }, async (request) => {
    const querySchema = z.object({
      type: z.enum(["income", "expense"]).optional(),
    });
    const query = querySchema.parse(request.query);

    return prisma.category.findMany({
      where: {
        userId: request.user.sub,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  });

  app.post("/categories", { preHandler: requireAuth }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      type: z.enum(["income", "expense"]),
    });
    const body = bodySchema.parse(request.body);

    const category = await prisma.category.create({
      data: {
        userId: request.user.sub,
        name: body.name,
        type: body.type,
      },
    });

    return reply.status(201).send(category);
  });

  app.put("/categories/:id", { preHandler: requireAuth }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      name: z.string().min(2),
      type: z.enum(["income", "expense"]),
    });
    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const updated = await prisma.category.updateMany({
      where: { id: params.id, userId: request.user.sub },
      data: { name: body.name, type: body.type },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: "Categoria nao encontrada" });
    }

    return prisma.category.findUniqueOrThrow({ where: { id: params.id } });
  });

  app.delete("/categories/:id", { preHandler: requireAuth }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const deleted = await prisma.category.deleteMany({
      where: { id: params.id, userId: request.user.sub },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: "Categoria nao encontrada" });
    }

    return reply.status(204).send();
  });
};
