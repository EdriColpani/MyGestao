import { describe, expect, it, vi } from "vitest";
import { getResolvedDatabaseUrlForPrisma, normalizePostgresUrlForServerless } from "@/server/database-url";

describe("getResolvedDatabaseUrlForPrisma", () => {
  it("prioriza PRISMA_DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://a:a@localhost:5432/a");
    vi.stubEnv("PRISMA_DATABASE_URL", "postgresql://b:b@pooler:6543/p");
    vi.stubEnv("POSTGRES_PRISMA_URL", "");
    expect(getResolvedDatabaseUrlForPrisma()).toContain("pooler");
    vi.unstubAllEnvs();
  });

  it("usa DATABASE_URL se for a unica", () => {
    vi.stubEnv("PRISMA_DATABASE_URL", "");
    vi.stubEnv("POSTGRES_PRISMA_URL", "");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
    expect(getResolvedDatabaseUrlForPrisma()).toContain("localhost");
    vi.unstubAllEnvs();
  });
});

describe("normalizePostgresUrlForServerless", () => {
  it("adiciona pgbouncer, sslmode e connection_limit para pooler Supabase na Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const raw =
      "postgresql://postgres.x:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const out = normalizePostgresUrlForServerless(raw);
    expect(out).toContain("pgbouncer=true");
    expect(out).toContain("sslmode=require");
    expect(out).toContain("connection_limit=1");
    expect(out).toContain("connect_timeout=15");
    vi.unstubAllEnvs();
  });

  it("nao duplica parametros existentes", () => {
    vi.stubEnv("VERCEL", "1");
    const raw =
      "postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
    const out = normalizePostgresUrlForServerless(raw);
    expect(out.match(/pgbouncer=true/g)?.length).toBe(1);
    vi.unstubAllEnvs();
  });

  it("fora da vercel nao forca connection_limit em host aleatorio", () => {
    vi.stubEnv("VERCEL", "");
    const raw = "postgresql://u:p@localhost:5432/mydb";
    expect(normalizePostgresUrlForServerless(raw)).toBe(raw);
    vi.unstubAllEnvs();
  });

  it("localhost nunca recebe parametros de pooler (modo local)", () => {
    vi.stubEnv("VERCEL", "1");
    const raw = "postgresql://u:p@localhost:5432/mydb";
    expect(normalizePostgresUrlForServerless(raw)).toBe(raw);
    vi.unstubAllEnvs();
  });
});
