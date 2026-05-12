import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/routes";
import { cardsRoutes } from "./modules/cards/routes";
import { incomesRoutes } from "./modules/incomes/routes";
import { expensesRoutes } from "./modules/expenses/routes";
import { paymentsRoutes } from "./modules/payments/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { categoriesRoutes } from "./modules/categories/routes";
import { reportsRoutes } from "./modules/reports/routes";
import { registerRequestContext } from "./plugins/request-context";

const parseCorsOrigins = (): string[] | null => {
  const raw = env.CORS_ORIGINS?.trim();
  if (!raw) return null;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const authRateLimitPaths = new Set(["/auth/login", "/auth/register", "/auth/refresh"]);

export const buildApp = () => {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  const allowedOrigins = parseCorsOrigins();
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (!allowedOrigins || allowedOrigins.length === 0) {
        cb(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
  });

  app.register(rateLimit, {
    global: true,
    max: 30,
    timeWindow: "1 minute",
    allowList: (request) => {
      const url = (request.url ?? "").split("?")[0] ?? "";
      return !authRateLimitPaths.has(url);
    },
  });

  app.register(jwt, { secret: env.JWT_SECRET });
  registerRequestContext(app);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(authRoutes);
  app.register(cardsRoutes);
  app.register(incomesRoutes);
  app.register(expensesRoutes);
  app.register(paymentsRoutes);
  app.register(dashboardRoutes);
  app.register(categoriesRoutes);
  app.register(reportsRoutes);

  return app;
};
