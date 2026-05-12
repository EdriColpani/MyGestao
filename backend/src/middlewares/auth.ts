import { FastifyReply, FastifyRequest } from "fastify";

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    await request.jwtVerify();
    if (request.user.tokenUse === "refresh") {
      reply.status(401).send({ message: "Use o access token" });
      return;
    }
  } catch {
    return reply.status(401).send({ message: "Nao autorizado" });
  }
};
