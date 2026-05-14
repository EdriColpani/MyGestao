import { getResolvedDatabaseUrlForPrisma } from "./database-url";
import { EMBEDDED_JWT_SECRET } from "./embedded-runtime-env";

let cached: { DATABASE_URL: string; JWT_SECRET: string } | null = null;

/**
 * Validação leve antes do Prisma ligar — o erro "invalid port number" costuma ser
 * password ou utilizador (ex. email) com `@`/`:`/`#`/`?`/`%` sem URL-encode na URI.
 */
export function validateDatabaseUrlEarly(raw: string | undefined): void {
  if (!raw?.trim()) return;
  const t = raw.trim();
  const placeholders = ["SEU_REF", "YOUR-PASSWORD", "[YOUR-PASSWORD]"];
  const bad = placeholders.find((p) => t.includes(p));
  if (bad) {
    throw new Error(`DATABASE_URL ainda contem texto de exemplo (${bad}).`);
  }

  const noQuery = t.split("?")[0] ?? t;
  const m = noQuery.match(/^postgres(ql)?:\/\/([^/]+)/i);
  if (!m) {
    throw new Error("DATABASE_URL deve comecar com postgresql:// ou postgres://");
  }
  const authority = m[2];
  const ats = (authority.match(/@/g) ?? []).length;
  if (ats > 1) {
    throw new Error(
      "DATABASE_URL: mais de um '@' na parte user:password@host — tipico quando o email do utilizador ou a password tem '@' ou ':' sem codificar. No PowerShell: [System.Uri]::EscapeDataString('teu_email@...') e o mesmo para a password; depois monta postgresql://USER_ENCODED:PASS_ENCODED@host:porta/postgres?...",
    );
  }

  const httpTry = t.replace(/^postgres(ql)?:/i, "http:");
  try {
    const u = new URL(httpTry);
    if (u.port && !/^\d{1,5}$/.test(u.port)) {
      throw new Error("porto nao numerico");
    }
  } catch {
    throw new Error(
      "DATABASE_URL invalida (porto/host). Revise aspas no .env, caracteres especiais na password (# ? % espacos → URL encode), e use a connection string copiada do Supabase (Transaction pooler ou Direct).",
    );
  }
}

export function getServerEnv(): { DATABASE_URL: string; JWT_SECRET: string } {
  if (cached) return cached;
  const jwtSecret = (process.env.JWT_SECRET?.trim() || EMBEDDED_JWT_SECRET.trim());
  if (jwtSecret.length < 10) {
    throw new Error(
      "Variaveis de ambiente invalidas: JWT_SECRET em falta ou com menos de 10 caracteres (defina no hosting ou em embedded-runtime-env.ts).",
    );
  }
  const dbUrl = getResolvedDatabaseUrlForPrisma();
  if (!dbUrl?.trim()) {
    throw new Error(
      "Defina DATABASE_URL (ex.: Postgres local) ou PRISMA_DATABASE_URL / POSTGRES_PRISMA_URL (URI pooler Supabase), ou preencha embedded-runtime-env.ts.",
    );
  }
  validateDatabaseUrlEarly(dbUrl);
  cached = { DATABASE_URL: dbUrl, JWT_SECRET: jwtSecret };
  return cached;
}

export function getJwtSecret(): string {
  return getServerEnv().JWT_SECRET;
}
