import { createClient } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/supabase/public-env";
import { ApiConfigError } from "@/server/api-errors";
import { getResolvedDatabaseUrlForPrisma } from "@/server/database-url";
import { signAccessToken, signRefreshToken } from "@/server/jwt";
import { ensureApiRuntimeEnv, prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_CATEGORIES: { name: string; type: "income" | "expense" }[] = [
  { name: "Salario", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Mercado", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Lazer", type: "expense" },
  { name: "Saude", type: "expense" },
  { name: "Educacao", type: "expense" },
];

/**
 * Garante linha em `public.users` com o mesmo UUID que `auth.users` (Supabase)
 * e categorias iniciais — necessário para o Prisma / RLS existentes.
 */
export async function POST(request: NextRequest) {
  try {
    ensureApiRuntimeEnv();
  } catch (e) {
    if (e instanceof ApiConfigError) {
      console.error("[sync-profile] config", e.logDetail ?? e.message);
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    console.error("[sync-profile] ensureApiRuntimeEnv", e);
    return NextResponse.json({ message: "Servico indisponivel" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
  }
  const token = auth.slice(7);

  const url = getSupabasePublicUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    return NextResponse.json({ message: "Supabase nao configurado no servidor" }, { status: 503 });
  }

  const supabase = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.id || !user.email) {
    return NextResponse.json({ message: "Sessao Supabase invalida" }, { status: 401 });
  }

  if (!getResolvedDatabaseUrlForPrisma()?.trim()) {
    return NextResponse.json(
      {
        message:
          "Falta DATABASE_URL no .env (pasta frontend). No Supabase: Project Settings → Database → Connection string (URI). Cole em DATABASE_URL, execute na pasta frontend: npx prisma db push, reinicie npm run dev.",
      },
      { status: 503 },
    );
  }

  const email = user.email;
  const nameMeta = String(user.user_metadata?.name ?? email.split("@")[0] ?? "Utilizador").slice(0, 120);

  try {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail && existingByEmail.id !== user.id) {
      return NextResponse.json(
        { message: "Este email ja esta associado a outra conta na base de dados." },
        { status: 409 },
      );
    }

    const placeholder = await bcrypt.hash(crypto.randomUUID(), 10);
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email,
        name: nameMeta,
        passwordHash: placeholder,
      },
      update: {
        email,
        name: nameMeta,
      },
    });

    const catCount = await prisma.category.count({ where: { userId: user.id } });
    if (catCount === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ userId: user.id, name: c.name, type: c.type })),
        skipDuplicates: true,
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (["P1001", "P1000", "P1017", "P1011", "P1013"].includes(e.code)) {
        return NextResponse.json(
          {
            message:
              "Nao foi possivel ligar a base de dados. Confirme DATABASE_URL no .env (password com caracteres especiais deve ir URL-encoded) e que o projeto Supabase esta ativo.",
          },
          { status: 503 },
        );
      }
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            message:
              "Tabelas em falta na base. Na pasta frontend execute: npx prisma db push",
          },
          { status: 503 },
        );
      }
    }
    const ctor =
      e && typeof e === "object" ? (e as { constructor?: { name?: string } }).constructor?.name : "";
    if (ctor === "PrismaClientInitializationError") {
      return NextResponse.json(
        {
          message:
            "Prisma nao conseguiu usar DATABASE_URL. Verifique a URI no .env (pasta frontend) e reinicie o servidor.",
        },
        { status: 503 },
      );
    }
    const dev = process.env.NODE_ENV === "development";
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[sync-profile]", e);
    return NextResponse.json(
      { message: dev ? msg : "Erro ao preparar a conta. Tente mais tarde." },
      { status: 500 },
    );
  }

  const jwtUser = { sub: user.id, email, role: "user" };
  return NextResponse.json({
    ok: true,
    accessToken: signAccessToken(jwtUser),
    refreshToken: signRefreshToken(jwtUser),
  });
}
