import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ApiConfigError } from "./api-errors";
import { ensureApiRuntimeEnv, prisma } from "./prisma";
import { toMonthStart } from "./date";
import { signAccessToken, signRefreshToken, verifyToken, type JwtUserPayload } from "./jwt";
import { withRls } from "./with-rls";

async function readJson(request: NextRequest): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined;
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw Object.assign(new Error("JSON invalido no corpo do pedido"), { status: 400 });
  }
}

function unauthorized(message = "Nao autorizado"): NextResponse {
  return NextResponse.json({ message }, { status: 401 });
}

function isDatabaseUnavailableError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1000", "P1017", "P1011", "P1013"].includes(e.code);
  }
  if (!e || typeof e !== "object") return false;
  const err = e as Error;
  const name = err.name ?? "";
  const ctor = (e as { constructor?: { name?: string } }).constructor?.name ?? "";
  if (name === "PrismaClientInitializationError" || ctor === "PrismaClientInitializationError") {
    return true;
  }
  const msg = typeof err.message === "string" ? err.message : "";
  return /P1001|P1000|P1017|P1011|P1013|Can't reach database server|connect ECONNREFUSED|connection timed out|Server has closed the connection|database .* does not exist|Invalid.*database string/i.test(
    msg,
  );
}

function isJwtSecretConfigError(e: unknown): boolean {
  if (!(e instanceof Error) || !e.message) return false;
  return /secretOrPrivateKey|secret key|JWT|jwt|HS256|key must have/i.test(e.message);
}

async function requireAccess(request: NextRequest): Promise<{ user: JwtUserPayload } | NextResponse> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return unauthorized();
  const token = auth.slice(7);
  try {
    const decoded = verifyToken(token);
    if (decoded.tokenUse === "refresh") {
      return unauthorized("Use o access token");
    }
    return { user: decoded };
  } catch {
    return unauthorized();
  }
}

/** Roteador HTTP — mesmas rotas que o antigo Fastify (`/auth/...`, `/cards`, …). */
export async function handleApiRequest(request: NextRequest, segments: string[]): Promise<NextResponse> {
  ensureApiRuntimeEnv();
  const method = request.method;
  const url = new URL(request.url);

  try {
    if (method === "POST" && segments[0] === "auth" && segments[1] === "register") {
      const bodySchema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        password: z.string().min(6),
      });
      const body = bodySchema.parse(await readJson(request));
      const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
      if (existingUser) {
        return NextResponse.json({ message: "Email ja cadastrado" }, { status: 409 });
      }
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await prisma.user.create({
        data: { name: body.name, email: body.email, passwordHash },
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
      return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
    }

    if (method === "POST" && segments[0] === "auth" && segments[1] === "login") {
      const bodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });
      const body = bodySchema.parse(await readJson(request));
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
        return NextResponse.json({ message: "Credenciais invalidas" }, { status: 401 });
      }
      const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);
      if (!passwordMatches) {
        return NextResponse.json({ message: "Credenciais invalidas" }, { status: 401 });
      }
      const payload: JwtUserPayload = { sub: user.id, email: user.email, role: user.role };
      return NextResponse.json({
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        user: { id: user.id, name: user.name, email: user.email },
      });
    }

    if (method === "POST" && segments[0] === "auth" && segments[1] === "refresh") {
      const bodySchema = z.object({ refreshToken: z.string().min(10) });
      const body = bodySchema.parse(await readJson(request));
      try {
        const decoded = verifyToken(body.refreshToken);
        if (decoded.tokenUse !== "refresh") {
          return NextResponse.json({ message: "Refresh token invalido" }, { status: 401 });
        }
        const accessToken = signAccessToken({
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        });
        return NextResponse.json({ accessToken });
      } catch {
        return NextResponse.json({ message: "Refresh token invalido ou expirado" }, { status: 401 });
      }
    }

    if (method === "GET" && segments[0] === "auth" && segments[1] === "me") {
      const auth = await requireAccess(request);
      if (auth instanceof NextResponse) return auth;
      const user = await withRls(auth.user.sub, (tx) =>
        tx.user.findUniqueOrThrow({
          where: { id: auth.user.sub },
          select: { id: true, name: true, email: true, role: true },
        }),
      );
      return NextResponse.json(user);
    }

    const auth = await requireAccess(request);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth.user;

    if (method === "GET" && segments[0] === "cards" && segments.length === 1) {
      const data = await withRls(userId, (tx) =>
        tx.card.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      );
      return NextResponse.json(data);
    }

    if (method === "POST" && segments[0] === "cards" && segments.length === 1) {
      const bodySchema = z.object({
        name: z.string().min(2),
        invoiceDueDay: z.number().int().min(1).max(31),
        limitAmount: z.number().positive(),
        brand: z.string().min(2),
        issuingBank: z.string().min(2),
      });
      const body = bodySchema.parse(await readJson(request));
      const card = await withRls(userId, (tx) =>
        tx.card.create({
          data: {
            userId,
            name: body.name,
            invoiceDueDay: body.invoiceDueDay,
            limitAmount: body.limitAmount,
            brand: body.brand,
            issuingBank: body.issuingBank,
          },
        }),
      );
      return NextResponse.json(card, { status: 201 });
    }

    if (method === "PUT" && segments[0] === "cards" && segments.length === 2) {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        name: z.string().min(2),
        invoiceDueDay: z.number().int().min(1).max(31),
        limitAmount: z.number().positive(),
        brand: z.string().min(2),
        issuingBank: z.string().min(2),
      });
      const params = paramsSchema.parse({ id: segments[1] });
      const body = bodySchema.parse(await readJson(request));
      const updated = await withRls(userId, (tx) =>
        tx.card.updateMany({
          where: { id: params.id, userId },
          data: {
            name: body.name,
            invoiceDueDay: body.invoiceDueDay,
            limitAmount: body.limitAmount,
            brand: body.brand,
            issuingBank: body.issuingBank,
          },
        }),
      );
      if (updated.count === 0) {
        return NextResponse.json({ message: "Cartao nao encontrado" }, { status: 404 });
      }
      const card = await withRls(userId, (tx) => tx.card.findUniqueOrThrow({ where: { id: params.id } }));
      return NextResponse.json(card);
    }

    if (method === "DELETE" && segments[0] === "cards" && segments.length === 2) {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const params = paramsSchema.parse({ id: segments[1] });
      const deleted = await withRls(userId, (tx) =>
        tx.card.deleteMany({ where: { id: params.id, userId } }),
      );
      if (deleted.count === 0) {
        return NextResponse.json({ message: "Cartao nao encontrado" }, { status: 404 });
      }
      return new NextResponse(null, { status: 204 });
    }

    if (method === "GET" && segments[0] === "categories" && segments.length === 1) {
      const querySchema = z.object({ type: z.enum(["income", "expense"]).optional() });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const data = await withRls(userId, (tx) =>
        tx.category.findMany({
          where: { userId, ...(query.type ? { type: query.type } : {}) },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
      );
      return NextResponse.json(data);
    }

    if (method === "POST" && segments[0] === "categories" && segments.length === 1) {
      const bodySchema = z.object({
        name: z.string().min(2),
        type: z.enum(["income", "expense"]),
      });
      const body = bodySchema.parse(await readJson(request));
      const category = await withRls(userId, (tx) =>
        tx.category.create({ data: { userId, name: body.name, type: body.type } }),
      );
      return NextResponse.json(category, { status: 201 });
    }

    if (method === "PUT" && segments[0] === "categories" && segments.length === 2) {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        name: z.string().min(2),
        type: z.enum(["income", "expense"]),
      });
      const params = paramsSchema.parse({ id: segments[1] });
      const body = bodySchema.parse(await readJson(request));
      const updated = await withRls(userId, (tx) =>
        tx.category.updateMany({
          where: { id: params.id, userId },
          data: { name: body.name, type: body.type },
        }),
      );
      if (updated.count === 0) {
        return NextResponse.json({ message: "Categoria nao encontrada" }, { status: 404 });
      }
      const cat = await withRls(userId, (tx) => tx.category.findUniqueOrThrow({ where: { id: params.id } }));
      return NextResponse.json(cat);
    }

    if (method === "DELETE" && segments[0] === "categories" && segments.length === 2) {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const params = paramsSchema.parse({ id: segments[1] });
      const deleted = await withRls(userId, (tx) =>
        tx.category.deleteMany({ where: { id: params.id, userId } }),
      );
      if (deleted.count === 0) {
        return NextResponse.json({ message: "Categoria nao encontrada" }, { status: 404 });
      }
      return new NextResponse(null, { status: 204 });
    }

    if (method === "GET" && segments[0] === "dashboard" && segments[1] === "summary") {
      const querySchema = z.object({ referenceMonth: z.string().regex(/^\d{4}-\d{2}$/) });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const month = toMonthStart(query.referenceMonth);
      const result = await withRls(userId, async (tx) => {
        const [incomeAgg, expenseAgg, pendingAgg] = await Promise.all([
          tx.monthlyIncome.aggregate({
            where: { userId, referenceMonth: month },
            _sum: { amount: true },
          }),
          tx.cashFlow.aggregate({
            where: { userId, referenceMonth: month, movementType: "expense" },
            _sum: { amount: true },
          }),
          tx.expenseInstallment.aggregate({
            where: { userId, referenceMonth: month, status: "pending" },
            _sum: { amount: true },
          }),
        ]);
        return {
          referenceMonth: query.referenceMonth,
          totalIncome: Number(incomeAgg._sum.amount ?? 0),
          totalExpense: Number(expenseAgg._sum.amount ?? 0),
          balance: Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0),
          pendingAmount: Number(pendingAgg._sum.amount ?? 0),
        };
      });
      return NextResponse.json(result);
    }

    if (method === "GET" && segments[0] === "incomes" && segments.length === 1) {
      const data = await withRls(userId, (tx) =>
        tx.monthlyIncome.findMany({ where: { userId }, orderBy: { referenceMonth: "desc" } }),
      );
      return NextResponse.json(data);
    }

    if (method === "POST" && segments[0] === "incomes" && segments.length === 1) {
      const bodySchema = z.object({
        categoryId: z.string().uuid(),
        referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
        description: z.string().min(2),
        amount: z.number().positive(),
        receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      });
      const body = bodySchema.parse(await readJson(request));
      const income = await withRls(userId, async (tx) => {
        const inc = await tx.monthlyIncome.create({
          data: {
            userId,
            categoryId: body.categoryId,
            referenceMonth: toMonthStart(body.referenceMonth),
            description: body.description,
            amount: body.amount,
            receivedDate: new Date(body.receivedDate),
          },
        });
        await tx.cashFlow.create({
          data: {
            userId,
            movementType: "income",
            originType: "monthly_income",
            originId: inc.id,
            referenceMonth: inc.referenceMonth,
            movementDate: inc.receivedDate,
            amount: inc.amount,
            description: inc.description,
          },
        });
        return inc;
      });
      return NextResponse.json(income, { status: 201 });
    }

    if (method === "GET" && segments[0] === "expenses" && segments[1] === "purchases") {
      const querySchema = z.object({ referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional() });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const data = await withRls(userId, (tx) =>
        tx.expensePurchase.findMany({
          where: {
            userId,
            ...(query.referenceMonth ? { referenceMonth: toMonthStart(query.referenceMonth) } : {}),
          },
          include: {
            card: { select: { name: true } },
            category: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
      return NextResponse.json(data);
    }

    if (method === "POST" && segments[0] === "expenses" && segments[1] === "purchases") {
      const bodySchema = z.object({
        referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
        expenseDescription: z.string().min(2),
        totalAmount: z.number().positive(),
        installments: z.number().int().min(1),
        purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        storeName: z.string().min(2),
        productDescription: z.string().min(2),
        cardId: z.string().uuid(),
        categoryId: z.string().uuid(),
      });
      const body = bodySchema.parse(await readJson(request));
      try {
        const purchase = await withRls(userId, async (tx) => {
          const [card, category] = await Promise.all([
            tx.card.findFirst({ where: { id: body.cardId, userId } }),
            tx.category.findFirst({ where: { id: body.categoryId, userId, type: "expense" } }),
          ]);
          if (!card || !category) {
            const err = new Error("Cartao ou categoria invalido para o usuario") as Error & { status: number };
            err.status = 400;
            throw err;
          }
          return tx.expensePurchase.create({
            data: {
              userId,
              cardId: body.cardId,
              categoryId: body.categoryId,
              referenceMonth: toMonthStart(body.referenceMonth),
              expenseDescription: body.expenseDescription,
              totalAmount: body.totalAmount,
              installments: body.installments,
              purchaseDate: new Date(body.purchaseDate),
              storeName: body.storeName,
              productDescription: body.productDescription,
            },
          });
        });
        return NextResponse.json(purchase, { status: 201 });
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.status === 400) {
          return NextResponse.json({ message: err.message }, { status: 400 });
        }
        throw e;
      }
    }

    if (method === "GET" && segments[0] === "expenses" && segments[1] === "installments") {
      const querySchema = z.object({
        referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
        cardId: z.string().uuid(),
        status: z.enum(["pending", "paid"]).optional(),
      });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const data = await withRls(userId, (tx) =>
        tx.expenseInstallment.findMany({
          where: {
            userId,
            cardId: query.cardId,
            referenceMonth: toMonthStart(query.referenceMonth),
            status: query.status,
          },
          include: {
            purchase: {
              select: {
                expenseDescription: true,
                storeName: true,
                productDescription: true,
              },
            },
          },
          orderBy: { installmentNumber: "asc" },
        }),
      );
      return NextResponse.json(data);
    }

    if (method === "POST" && segments[0] === "payments" && segments[1] === "invoices" && segments[2] === "process") {
      const bodySchema = z.object({
        cardId: z.string().uuid(),
        referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
        paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        installmentIds: z.array(z.string().uuid()).min(1),
      });
      const body = bodySchema.parse(await readJson(request));
      const referenceMonth = toMonthStart(body.referenceMonth);
      const result = await withRls(userId, (tx) =>
        tx.$queryRaw<{ payment_id: string }[]>`
      SELECT fn_process_invoice_payment(
        ${userId}::uuid,
        ${body.cardId}::uuid,
        ${referenceMonth}::date,
        ${new Date(body.paymentDate)}::date,
        ${body.installmentIds}::uuid[]
      ) AS payment_id
    `,
      );
      const paymentId = result[0]?.payment_id;
      if (!paymentId) {
        return NextResponse.json({ message: "Pagamento nao processado" }, { status: 400 });
      }
      const payment = await withRls(userId, (tx) =>
        tx.cardInvoicePayment.findFirst({
          where: { id: paymentId, userId },
          include: { items: true },
        }),
      );
      return NextResponse.json(payment);
    }

    if (method === "GET" && segments[0] === "reports" && segments[1] === "payments") {
      const querySchema = z.object({
        fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
        toMonth: z.string().regex(/^\d{4}-\d{2}$/),
        cardId: z.string().uuid().optional(),
      });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const from = toMonthStart(query.fromMonth);
      const to = toMonthStart(query.toMonth);
      const data = await withRls(userId, (tx) =>
        tx.cardInvoicePayment.findMany({
          where: {
            userId,
            referenceMonth: { gte: from, lte: to },
            ...(query.cardId ? { cardId: query.cardId } : {}),
          },
          include: {
            card: true,
            items: {
              include: {
                installment: {
                  include: {
                    purchase: { include: { category: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        }),
      );
      return NextResponse.json(data);
    }

    if (method === "GET" && segments[0] === "reports" && segments[1] === "installments") {
      const querySchema = z.object({
        fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
        toMonth: z.string().regex(/^\d{4}-\d{2}$/),
        cardId: z.string().uuid().optional(),
        categoryId: z.string().uuid().optional(),
        status: z.enum(["pending", "paid"]).optional(),
      });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const from = toMonthStart(query.fromMonth);
      const to = toMonthStart(query.toMonth);
      const data = await withRls(userId, (tx) =>
        tx.expenseInstallment.findMany({
          where: {
            userId,
            referenceMonth: { gte: from, lte: to },
            ...(query.cardId ? { cardId: query.cardId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.categoryId ? { purchase: { categoryId: query.categoryId } } : {}),
          },
          include: {
            card: true,
            purchase: { include: { category: true } },
          },
          orderBy: [{ referenceMonth: "asc" }, { installmentNumber: "asc" }],
        }),
      );
      return NextResponse.json(data);
    }

    if (method === "GET" && segments[0] === "reports" && segments[1] === "charts" && segments[2] === "monthly") {
      const querySchema = z.object({
        months: z.coerce.number().int().min(3).max(24).default(6),
      });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1), 1));
      const { series, indicators } = await withRls(userId, async (tx) => {
        const [incomeGroups, expenseGroups] = await Promise.all([
          tx.monthlyIncome.groupBy({
            by: ["referenceMonth"],
            where: { userId, referenceMonth: { gte: start } },
            _sum: { amount: true },
          }),
          tx.cashFlow.groupBy({
            by: ["referenceMonth"],
            where: {
              userId,
              movementType: "expense",
              referenceMonth: { gte: start },
            },
            _sum: { amount: true },
          }),
        ]);
        const monthKey = (d: Date) =>
          `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const labels: string[] = [];
        for (let i = 0; i < query.months; i++) {
          const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1 - i), 1));
          labels.push(monthKey(d));
        }
        const incomeMap = new Map(
          incomeGroups.map((g) => [monthKey(g.referenceMonth), Number(g._sum.amount ?? 0)]),
        );
        const expenseMap = new Map(
          expenseGroups.map((g) => [monthKey(g.referenceMonth), Number(g._sum.amount ?? 0)]),
        );
        const seriesLocal = labels.map((label) => ({
          month: label,
          income: incomeMap.get(label) ?? 0,
          expense: expenseMap.get(label) ?? 0,
        }));
        const totalIncome = seriesLocal.reduce((a, b) => a + b.income, 0);
        const totalExpense = seriesLocal.reduce((a, b) => a + b.expense, 0);
        return {
          series: seriesLocal,
          indicators: {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            savingsRate: totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0,
          },
        };
      });
      return NextResponse.json({ series, indicators });
    }

    if (method === "GET" && segments[0] === "reports" && segments[1] === "summary" && segments[2] === "by-card") {
      const querySchema = z.object({
        fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
        toMonth: z.string().regex(/^\d{4}-\d{2}$/),
      });
      const query = querySchema.parse(Object.fromEntries(url.searchParams));
      const from = toMonthStart(query.fromMonth);
      const to = toMonthStart(query.toMonth);
      const rows = await withRls(userId, (tx) =>
        tx.expenseInstallment.groupBy({
          by: ["cardId"],
          where: { userId, referenceMonth: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      );
      const cards = await withRls(userId, (tx) =>
        tx.card.findMany({
          where: { userId, id: { in: rows.map((r) => r.cardId) } },
        }),
      );
      const cardMap = new Map(cards.map((c) => [c.id, c]));
      const out = rows.map((r) => ({
        cardId: r.cardId,
        cardName: cardMap.get(r.cardId)?.name ?? null,
        totalAmount: Number(r._sum.amount ?? 0),
      }));
      return NextResponse.json(out);
    }

    return NextResponse.json({ message: "Rota nao encontrada" }, { status: 404 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: e.flatten().formErrors.join(", ") || "Payload invalido" }, { status: 400 });
    }
    if (e instanceof ApiConfigError) {
      return NextResponse.json({ message: e.message }, { status: e.statusCode });
    }
    const err = e as Error & { status?: number };
    if (err.status === 400) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (isJwtSecretConfigError(e)) {
      return NextResponse.json(
        {
          message:
            "JWT_SECRET invalido ou incompativel no servidor. Na Vercel: Settings → Environment Variables — use uma string aleatoria (ex. openssl rand -base64 32), minimo 10 caracteres, guarde e redeploy.",
        },
        { status: 503 },
      );
    }
    if (e instanceof Error && /^Variaveis de ambiente invalidas/i.test(e.message)) {
      return NextResponse.json({ message: e.message }, { status: 503 });
    }
    if (
      isDatabaseUnavailableError(e) ||
      (e instanceof Error &&
        (e.name === "PrismaClientInitializationError" || e.constructor?.name === "PrismaClientInitializationError"))
    ) {
      return NextResponse.json(
        {
          message:
            "Ligacao a base de dados falhou. Confirme DATABASE_URL na Vercel (ambiente Production), password e caracteres especiais URL-encoded na URI, pooler Supabase (porta 6543) e sslmode=require; depois redeploy.",
        },
        { status: 503 },
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      const hint = `${e.message} ${JSON.stringify(e.meta ?? {})}`;
      if (hint.includes("user_id") || hint.includes("users")) {
        return NextResponse.json(
          {
            message:
              "Sessao desatualizada: o utilizador deste token nao existe nesta base de dados. Use Sair, apague dados do site (localStorage) ou janela anonima, e faca login de novo.",
          },
          { status: 401 },
        );
      }
    }
    console.error("[api]", e);
    const expose =
      process.env.NODE_ENV === "development" || process.env.API_DEBUG_ERRORS === "1";
    const detail =
      expose && e instanceof Error
        ? `${e.name}: ${e.message}`.slice(0, 500)
        : "Erro interno";
    return NextResponse.json({ message: detail }, { status: 500 });
  }
}
