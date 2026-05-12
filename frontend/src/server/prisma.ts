import { PrismaClient } from "@prisma/client";
import { validateDatabaseUrlEarly } from "./env";

function assertVercelServerEnv(): void {
  if (!process.env.VERCEL) return;
  const db = process.env.DATABASE_URL?.trim();
  const jwt = process.env.JWT_SECRET?.trim();
  if (!db) {
    throw new Error(
      "DATABASE_URL em falta: Vercel > Project > Settings > Environment Variables > adicione DATABASE_URL (Production) e redeploy.",
    );
  }
  if (!jwt || jwt.length < 10) {
    throw new Error(
      "JWT_SECRET em falta ou invalido: adicione JWT_SECRET com pelo menos 10 caracteres (Production) e redeploy.",
    );
  }
}

assertVercelServerEnv();
validateDatabaseUrlEarly(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
