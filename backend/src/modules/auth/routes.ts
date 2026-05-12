import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../plugins/prisma";
import { requireAuth } from "../../middlewares/auth";

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/auth/register", async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const body = bodySchema.parse(request.body);
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return reply.status(409).send({ message: "Email ja cadastrado" });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
      },
    });

    await prisma.category.createMany({
      data: [
        { userId: user.id, name: "Salario", type: "income" },
        { userId: user.id, name: "Freelance", type: "income" },
        { userId: user.id, name: "Mercado", type: "expense" },
        { userId: user.id, name: "Transporte", type: "expense" },
        { userId: user.id, name: "Lazer", type: "expense" },
        { userId: user.id, name: "Saude", type: "expense" },
        { userId: user.id, name: "Educacao", type: "expense" },
      ],
      skipDuplicates: true,
    });

    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const body = bodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });
    if (!user || !user.isActive) {
      return reply.status(401).send({ message: "Credenciais invalidas" });
    }

    const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordMatches) {
      return reply.status(401).send({ message: "Credenciais invalidas" });
    }

    const accessToken = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenUse: "access",
      },
      {
        expiresIn: "15m",
      },
    );

    const refreshToken = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenUse: "refresh",
      },
      {
        expiresIn: "7d",
      },
    );

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const bodySchema = z.object({
      refreshToken: z.string().min(10),
    });
    const body = bodySchema.parse(request.body);

    try {
      const decoded = app.jwt.verify<{ tokenUse?: string; sub: string; email: string; role: string }>(
        body.refreshToken,
      );
      if (decoded.tokenUse !== "refresh") {
        return reply.status(401).send({ message: "Refresh token invalido" });
      }

      const accessToken = app.jwt.sign(
        {
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          tokenUse: "access",
        },
        { expiresIn: "15m" },
      );

      return reply.send({ accessToken });
    } catch {
      return reply.status(401).send({ message: "Refresh token invalido ou expirado" });
    }
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      select: { id: true, name: true, email: true, role: true },
    });

    return user;
  });
};
