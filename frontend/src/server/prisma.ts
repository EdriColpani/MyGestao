import { PrismaClient } from "@prisma/client";
import { ApiConfigError } from "./api-errors";
import { validateDatabaseUrlEarly } from "./env";

function assertVercelServerEnv(): void {
  if (!process.env.VERCEL) return;
  const db = process.env.DATABASE_URL?.trim();
  const jwt = process.env.JWT_SECRET?.trim();
  if (!db) {
    throw new ApiConfigError(
      "DATABASE_URL em falta neste deploy. Na Vercel: abra o projeto (Dashboard) → separador Settings no topo da pagina do projeto → menu esquerdo: Environment Variables → adicione DATABASE_URL, ambiente Production (e Preview se precisar) → Save → Redeploy. Guia: https://vercel.com/docs/environment-variables/managing-environment-variables",
    );
  }
  if (!jwt || jwt.length < 10) {
    throw new ApiConfigError(
      "JWT_SECRET em falta ou invalido (min. 10 caracteres). Na Vercel: projeto → Settings → Environment Variables → adicione JWT_SECRET para Production → Save → Redeploy.",
    );
  }
}

/** Não correr no import: o `next build` carrega as rotas API sem env e falhava em "Collecting page data". */
let runtimeEnvOk = false;

export function ensureApiRuntimeEnv(): void {
  if (runtimeEnvOk) return;
  assertVercelServerEnv();
  try {
    validateDatabaseUrlEarly(process.env.DATABASE_URL);
  } catch (e) {
    if (e instanceof Error) throw new ApiConfigError(e.message);
    throw e;
  }
  runtimeEnvOk = true;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
