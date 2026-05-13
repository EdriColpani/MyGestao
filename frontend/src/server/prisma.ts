import { PrismaClient } from "@prisma/client";
import { ApiConfigError } from "./api-errors";
import { normalizePostgresUrlForServerless } from "./database-url";
import { validateDatabaseUrlEarly } from "./env";

function assertVercelServerEnv(): void {
  if (!process.env.VERCEL) return;
  const db = process.env.DATABASE_URL?.trim();
  const jwt = process.env.JWT_SECRET?.trim();
  if (!db) {
    throw new ApiConfigError(
      "Servico temporariamente indisponivel. Tente mais tarde.",
      503,
      "Vercel Production: falta DATABASE_URL. Projeto → Settings → Environment Variables → adicionar e redeploy.",
    );
  }
  if (!jwt || jwt.length < 10) {
    throw new ApiConfigError(
      "Servico temporariamente indisponivel. Tente mais tarde.",
      503,
      "Vercel Production: JWT_SECRET em falta ou com menos de 10 caracteres. Settings → Environment Variables → redeploy.",
    );
  }
}

/** Não correr no import: o `next build` carrega as rotas API sem env e falhava em "Collecting page data". */
let runtimeEnvOk = false;

export function ensureApiRuntimeEnv(): void {
  if (runtimeEnvOk) return;
  assertVercelServerEnv();
  const raw = process.env.DATABASE_URL!.trim();
  try {
    validateDatabaseUrlEarly(raw);
    const normalized = normalizePostgresUrlForServerless(raw);
    if (normalized !== raw) {
      validateDatabaseUrlEarly(normalized);
    }
  } catch (e) {
    if (e instanceof Error) {
      throw new ApiConfigError(
        "Servico temporariamente indisponivel. Tente mais tarde.",
        503,
        `DATABASE_URL invalida: ${e.message}`,
      );
    }
    throw e;
  }
  runtimeEnvOk = true;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  const url = normalizePostgresUrlForServerless(raw);
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
