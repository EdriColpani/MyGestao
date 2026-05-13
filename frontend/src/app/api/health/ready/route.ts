import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ApiConfigError } from "@/server/api-errors";
import { ensureApiRuntimeEnv, prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Readiness: variáveis obrigatórias na Vercel + ligação Prisma.
 * Abra após deploy: `/api/health/ready` — se não for 200, o login também não funcionará.
 */
export async function GET() {
  try {
    ensureApiRuntimeEnv();
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: true, at: new Date().toISOString() });
  } catch (e) {
    if (e instanceof ApiConfigError) {
      return NextResponse.json({ ok: false, step: "env", message: e.message }, { status: 503 });
    }
    console.error("[health/ready]", e);
    return NextResponse.json(
      {
        ok: false,
        step: "database",
        message:
          "Prisma nao conseguiu ligar a DATABASE_URL. Confirme a URI na Vercel (Production), SSL/pooler Supabase e redeploy.",
      },
      { status: 503 },
    );
  }
}
