import { FastifyInstance } from "fastify";
import { prisma } from "./prisma";

export const registerRequestContext = (app: FastifyInstance): void => {
  app.addHook("preHandler", async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return;
    }

    try {
      await request.jwtVerify();
      const userId = request.user.sub;

      await prisma.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    } catch {
      // Ignore silently, auth middleware handles protected routes.
    }
  });
};
