import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
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
  } catch {
    return NextResponse.json({ message: "Servico indisponivel" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
  }
  const token = auth.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
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

  const email = user.email;
  const nameMeta = String(user.user_metadata?.name ?? email.split("@")[0] ?? "Utilizador").slice(0, 120);

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

  return NextResponse.json({ ok: true });
}
